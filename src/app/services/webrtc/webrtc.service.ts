import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, take } from 'rxjs';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  updateDoc
} from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';

export interface OnlineUser {
  id: string;
  name: string;
  role: 'medecin' | 'infirmier';
  status: 'online' | 'in-call' | 'offline';
  lastSeen: Date;
}

export interface CallState {
  isInCall: boolean;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isAudioOnly: boolean;
  remotePeerName: string | null;
  callStartTime: Date | null;
}

interface RTCSignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  from: string;
  to: string;
  sessionData: {
    sdp?: string;
    type?: RTCSdpType;
    candidate?: RTCIceCandidateInit;
  };
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localStreamSubject = new BehaviorSubject<MediaStream | null>(null);
  private currentSessionId: string | null = null;
  private signalingUnsubscribe: (() => void) | null = null;
  private pendingCandidates: RTCIceCandidate[] = [];

  private callStateSubject = new BehaviorSubject<CallState>({
    isInCall: false,
    remoteStream: null,
    localStream: null,
    isMuted: false,
    isCameraOff: false,
    isAudioOnly: false,
    remotePeerName: null,
    callStartTime: null
  });

  readonly callState$ = this.callStateSubject.asObservable();

  private readonly configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:numb.viagenie.ca',
        username: 'webrtc@live.com',
        credential: 'muazkh'
      }
    ]
  };

  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {
    this.setupSignalingHandlers();
  }

  getOnlineUsers(): Observable<OnlineUser[]> {
    const usersRef = collection(this.firestore, 'users');
    const onlineUsersQuery = query(usersRef, where('status', 'in', ['online', 'in-call']));

    return new Observable<OnlineUser[]>(observer => {
      const unsubscribe = onSnapshot(onlineUsersQuery, (snapshot) => {
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as OnlineUser));
        observer.next(users);
      });

      return () => unsubscribe();
    });
  }

  async startCall(targetUserId: string): Promise<void> {
    try {
      const user = await this.authService.user$.pipe(take(1)).toPromise();
      if (!user) throw new Error('User not authenticated');

      if (!await this.checkMediaPermissions()) {
        throw new Error('Les permissions de média sont nécessaires pour passer un appel');
      }

      this.currentSessionId = `${user.uid}_${targetUserId}`;
      const localStream = await this.getLocalStream();
      await this.initializePeerConnection(localStream);

      const offer = await this.peerConnection!.createOffer();
      await this.peerConnection!.setLocalDescription(offer);

      await this.sendSignalingMessage({
        type: 'offer',
        from: user.uid,
        to: targetUserId,
        sessionData: {
          sdp: offer.sdp,
          type: offer.type
        },
        timestamp: new Date()
      });

      this.updateCallState({
        isInCall: true,
        localStream,
        callStartTime: new Date()
      });

      await this.updateUserStatus('in-call');

    } catch (error) {
      console.error('Error starting call:', error);
      this.endCall();
    }
  }

  private async getLocalStream(): Promise<MediaStream> {
    try {
      // Essayer d'obtenir les permissions
      const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
      if (permissions.state === 'denied') {
        throw new Error('PERMISSION_DENIED');
      }

      // Essayer d'abord avec vidéo et audio
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: true
        });
        return stream;
      } catch (videoError) {
        // Si la vidéo échoue, essayer audio uniquement
        console.log('Échec de l\'accès à la caméra, tentative audio uniquement');
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false
        });
        
        this.updateCallState({
          isAudioOnly: true,
          isCameraOff: true
        });
        
        return audioStream;
      }
    } catch (error: unknown) {
      console.error('Erreur lors de l\'accès aux périphériques média:', error);
      if (
        (error instanceof Error && error.message === 'PERMISSION_DENIED') || 
        (error instanceof DOMException && error.name === 'NotAllowedError')
      ) {
        throw new Error('PERMISSION_DENIED');
      }
      throw error;
    }
  }

  private async initializePeerConnection(localStream: MediaStream): Promise<void> {
    this.peerConnection = new RTCPeerConnection(this.configuration);

    console.log('Adding local tracks to peer connection');
    localStream.getTracks().forEach(track => {
      this.peerConnection!.addTrack(track, localStream);
    });

    this.peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event);
      if (event.streams && event.streams[0]) {
        const currentState = this.callStateSubject.value;
        console.log('Updating call state with remote stream');
        this.callStateSubject.next({
          ...currentState,
          remoteStream: event.streams[0]
        });
      }
    };

    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        const user = await this.authService.user$.pipe(take(1)).toPromise();
        if (!user || !this.currentSessionId) return;

        const [caller, callee] = this.currentSessionId.split('_');
        const targetUserId = user.uid === caller ? callee : caller;

        await this.sendSignalingMessage({
          type: 'ice-candidate',
          from: user.uid,
          to: targetUserId,
          sessionData: {
            candidate: event.candidate.toJSON()
          },
          timestamp: new Date()
        });
      }
    };

    this.setupDataChannel();
  }

  private setupDataChannel(): void {
    if (!this.peerConnection) return;

    this.dataChannel = this.peerConnection.createDataChannel('messages');

    this.dataChannel.onmessage = (event) => {
      console.log('Message received:', event.data);
    };

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
    };
  }

  private async handleSignalingMessage(message: RTCSignalingMessage): Promise<void> {
    console.log('Handling signaling message:', message);
    const user = await this.authService.user$.pipe(take(1)).toPromise();
    if (!user) return;

    try {
      if (!this.peerConnection) {
        const localStream = await this.getLocalStream();
        await this.initializePeerConnection(localStream);
        
        this.updateCallState({
          localStream,
          isInCall: true,
          callStartTime: new Date()
        });
      }

      switch (message.type) {
        case 'offer':
          if (message.sessionData.sdp && message.sessionData.type) {
            await this.peerConnection!.setRemoteDescription(
              new RTCSessionDescription({
                sdp: message.sessionData.sdp,
                type: message.sessionData.type
              })
            );

            for (const candidate of this.pendingCandidates) {
              await this.peerConnection!.addIceCandidate(candidate);
            }
            this.pendingCandidates = [];

            const answer = await this.peerConnection!.createAnswer();
            await this.peerConnection!.setLocalDescription(answer);

            await this.sendSignalingMessage({
              type: 'answer',
              from: user.uid,
              to: message.from,
              sessionData: {
                sdp: answer.sdp,
                type: answer.type
              },
              timestamp: new Date()
            });
          }
          break;

        case 'answer':
          if (message.sessionData.sdp && message.sessionData.type) {
            await this.peerConnection!.setRemoteDescription(
              new RTCSessionDescription({
                sdp: message.sessionData.sdp,
                type: message.sessionData.type
              })
            );

            for (const candidate of this.pendingCandidates) {
              await this.peerConnection!.addIceCandidate(candidate);
            }
            this.pendingCandidates = [];
          }
          break;

        case 'ice-candidate':
          if (message.sessionData.candidate) {
            const candidate = new RTCIceCandidate(message.sessionData.candidate);
            if (this.peerConnection?.remoteDescription) {
              await this.peerConnection.addIceCandidate(candidate);
            } else {
              this.pendingCandidates.push(candidate);
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  }

  private setupSignalingHandlers(): void {
    this.authService.user$.pipe(take(1)).subscribe(user => {
      if (!user) return;

      const rtcSessionsRef = collection(this.firestore, 'rtcSessions');
      
      this.signalingUnsubscribe = onSnapshot(
        query(rtcSessionsRef, where('to', '==', user.uid)),
        async (snapshot) => {
          snapshot.docChanges().forEach(async change => {
            if (change.type === 'added') {
              const message = change.doc.data() as RTCSignalingMessage;
              await this.handleSignalingMessage(message);
            }
          });
        }
      );
    });
  }

  private async sendSignalingMessage(message: RTCSignalingMessage): Promise<void> {
    console.log('Sending signaling message:', message);
    try {
      const sessionDoc = doc(this.firestore, 'rtcSessions', this.currentSessionId!);
      await setDoc(sessionDoc, message);
    } catch (error) {
      console.error('Error sending signaling message:', error);
    }
  }

  private async updateUserStatus(status: 'online' | 'in-call' | 'offline'): Promise<void> {
    const user = await this.authService.user$.pipe(take(1)).toPromise();
    if (user) {
      const userDoc = doc(this.firestore, 'users', user.uid);
      await updateDoc(userDoc, {
        status,
        lastSeen: new Date()
      });
    }
  }

  private updateCallState(partialState: Partial<CallState>): void {
    const currentState = this.callStateSubject.value;
    this.callStateSubject.next({
      ...currentState,
      ...partialState
    });
  }

  async endCall(): Promise<void> {
    try {
      this.pendingCandidates = [];
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      if (this.callStateSubject.value.localStream) {
        this.callStateSubject.value.localStream.getTracks().forEach(track => track.stop());
      }

      if (this.signalingUnsubscribe) {
        this.signalingUnsubscribe();
        this.signalingUnsubscribe = null;
      }

      if (this.currentSessionId) {
        const sessionDoc = doc(this.firestore, 'rtcSessions', this.currentSessionId);
        await deleteDoc(sessionDoc);
        this.currentSessionId = null;
      }

      this.callStateSubject.next({
        isInCall: false,
        remoteStream: null,
        localStream: null,
        isMuted: false,
        isCameraOff: false,
        isAudioOnly: false,
        remotePeerName: null,
        callStartTime: null
      });

      await this.updateUserStatus('online');

    } catch (error) {
      console.error('Error ending call:', error);
    }
  }

  toggleMute(): void {
    const currentState = this.callStateSubject.value;
    if (currentState.localStream) {
      currentState.localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      this.callStateSubject.next({
        ...currentState,
        isMuted: !currentState.isMuted
      });
    }
  }

  toggleCamera(): void {
    const currentState = this.callStateSubject.value;
    if (currentState.localStream) {
      currentState.localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      this.callStateSubject.next({
        ...currentState,
        isCameraOff: !currentState.isCameraOff
      });
    }
  }

  toggleAudioOnly(): void {
    const currentState = this.callStateSubject.value;
    this.callStateSubject.next({
      ...currentState,
      isAudioOnly: !currentState.isAudioOnly
    });
  }

  async joinCall(sessionId: string, targetUserId: string): Promise<void> {
    try {
      const user = await this.authService.user$.pipe(take(1)).toPromise();
      if (!user) throw new Error('User not authenticated');

      if (!await this.checkMediaPermissions()) {
        throw new Error('Les permissions de média sont nécessaires pour rejoindre un appel');
      }

      this.currentSessionId = sessionId;
      const localStream = await this.getLocalStream();
      await this.initializePeerConnection(localStream);

      this.updateCallState({
        isInCall: true,
        localStream,
        callStartTime: new Date()
      });

      await this.updateUserStatus('in-call');

      await new Promise(resolve => setTimeout(resolve, 1000));

      const offer = await this.peerConnection!.createOffer();
      await this.peerConnection!.setLocalDescription(offer);

      await this.sendSignalingMessage({
        type: 'offer',
        from: user.uid,
        to: targetUserId,
        sessionData: {
          sdp: offer.sdp,
          type: offer.type
        },
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error joining call:', error);
      this.endCall();
    }
  }

  private async checkMediaPermissions(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoInput = devices.some(device => device.kind === 'videoinput');
      const hasAudioInput = devices.some(device => device.kind === 'audioinput');

      if (!hasVideoInput && !hasAudioInput) {
        console.warn('Aucun périphérique média détecté');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      return false;
    }
  }
}

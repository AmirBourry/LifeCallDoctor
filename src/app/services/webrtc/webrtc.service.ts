import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, take, distinctUntilChanged } from 'rxjs';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  updateDoc,
  getDocs,
  getDoc
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

export interface IncomingCall {
  sessionId: string;
  callerId: string;
  callerName: string;
}

interface RTCSignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-request' | 'call-accepted';
  from: string;
  to: string;
  sessionData: {
    sdp?: string;
    type?: RTCSdpType;
    candidate?: RTCIceCandidateInit;
    callerName?: string;
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
  private pendingIceCandidates: RTCIceCandidateInit[] = [];

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
      {
        urls: [
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302'
        ]
      },
      {
        // Serveur TURN public pour les tests
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        // Serveur TURN public pour les tests (backup)
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };

  private incomingCallSubject = new BehaviorSubject<IncomingCall | null>(null);
  readonly incomingCall$ = this.incomingCallSubject.asObservable();

  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {
    console.log('WebRTCService constructor');
    
    // S'assurer que l'écouteur est mis en place dès qu'un utilisateur est authentifié
    this.authService.user$.subscribe(user => {
      console.log('Auth state changed in WebRTCService:', user?.uid);
      if (user) {
        console.log('Setting up signaling handlers for user:', user.uid);
        this.setupSignalingHandlers();
      } else {
        if (this.signalingUnsubscribe) {
          console.log('Cleaning up signaling handler');
          this.signalingUnsubscribe();
          this.signalingUnsubscribe = null;
        }
        this.resetCallState();
      }
    });
  }

  private resetCallState(): void {
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
    this.incomingCallSubject.next(null);
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

      console.log('Starting call to:', targetUserId);
      this.currentSessionId = `${user.uid}_${targetUserId}`;

      // Envoyer une demande d'appel
      await this.sendSignalingMessage({
        type: 'call-request',
        from: user.uid,
        to: targetUserId,
        sessionData: {
          callerName: user.displayName || 'Médecin'
        },
        timestamp: new Date()
      });

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
      console.log('Adding track to peer connection:', track.kind);
      this.peerConnection!.addTrack(track, localStream);
    });

    // Mettre à jour immédiatement l'état avec le flux local
    this.updateCallState({
      localStream,
      isInCall: true
    });

    this.peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        console.log('Updating call state with remote stream');
        const remoteStream = event.streams[0];
        
        // Activer tous les tracks du flux distant
        remoteStream.getTracks().forEach(track => {
          track.enabled = true;
          console.log(`Remote ${track.kind} track enabled:`, track.enabled);
        });

        // Mettre à jour l'état avec le flux distant
        this.updateCallState({
          remoteStream,
          isInCall: true
        });

        // Vérifier que les deux flux sont présents
        this.checkStreamsState();
      }
    };

    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('New ICE candidate:', event.candidate.type, event.candidate.protocol);
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
      } else {
        console.log('ICE candidate gathering completed');
      }
    };

    this.peerConnection.onicegatheringstatechange = () => {
      console.log('ICE gathering state changed:', this.peerConnection?.iceGatheringState);
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state changed:', this.peerConnection?.iceConnectionState);
      if (this.peerConnection?.iceConnectionState === 'failed') {
        console.log('ICE connection failed, attempting to restart ICE');
        this.restartIceConnection();
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'connected') {
        console.log('Peer connection established successfully');
      } else if (this.peerConnection?.connectionState === 'failed') {
        console.log('Connection failed, attempting to reconnect...');
        this.restartConnection();
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

  private setupSignalingHandlers(): void {
    console.log('Setting up signaling handlers');
    if (this.signalingUnsubscribe) {
      console.log('Cleaning up previous signaling handler');
      this.signalingUnsubscribe();
    }

    this.authService.user$.pipe(take(1)).subscribe(async user => {
      if (!user) {
        console.log('No user found for signaling setup');
        return;
      }

      console.log('Setting up signaling handlers for user:', user.uid);
      const rtcSignalingRef = collection(this.firestore, 'rtcSignaling');
      
      // Vérifier d'abord s'il y a des messages en attente
      const pendingQuery = query(rtcSignalingRef, where('to', '==', user.uid));
      const pendingSnapshot = await getDocs(pendingQuery);
      console.log('Checking pending messages:', pendingSnapshot.docs.length);
      
      for (const doc of pendingSnapshot.docs) {
        const message = doc.data() as RTCSignalingMessage;
        console.log('Processing pending message:', message);
        try {
          await this.handleSignalingMessage(message);
          await deleteDoc(doc.ref);
        } catch (error) {
          console.error('Error processing pending message:', error);
        }
      }

      // Mettre en place l'écouteur pour les nouveaux messages
      this.signalingUnsubscribe = onSnapshot(
        pendingQuery,
        {
          next: async (snapshot) => {
            console.log('Signaling snapshot received, docs:', snapshot.docs.length);
            for (const change of snapshot.docChanges()) {
              console.log('Document change:', change.type, change.doc.data());
              if (change.type === 'added') {
                const message = change.doc.data() as RTCSignalingMessage;
                console.log('Processing new message:', message);
                
                try {
                  await this.handleSignalingMessage(message);
                  console.log('Message processed, deleting document');
                  await deleteDoc(change.doc.ref);
                } catch (error) {
                  console.error('Error handling signaling message:', error);
                }
              }
            }
          },
          error: (error) => {
            console.error('Error in signaling handler:', error);
          }
        }
      );
    });
  }

  private async handleSignalingMessage(message: RTCSignalingMessage): Promise<void> {
    console.log('Handling signaling message:', message);
    const user = await this.authService.user$.pipe(take(1)).toPromise();
    if (!user) return;

    try {
      switch (message.type) {
        case 'call-request':
          console.log('Processing call request from:', message.from);
          if (!this.callStateSubject.value.isInCall) {
            this.incomingCallSubject.next({
              sessionId: `${message.from}_${user.uid}`,
              callerId: message.from,
              callerName: message.sessionData.callerName || 'Unknown'
            });
            console.log('Incoming call set:', this.incomingCallSubject.value);
          }
          break;

        case 'call-accepted':
          console.log('Call accepted by:', message.from);
          if (!this.peerConnection) {
            const localStream = await this.getLocalStream();
            await this.initializePeerConnection(localStream);
          }
          
          // Créer et envoyer l'offre
          const offer = await this.peerConnection!.createOffer();
          await this.peerConnection!.setLocalDescription(offer);

          await this.sendSignalingMessage({
            type: 'offer',
            from: user.uid,
            to: message.from,
            sessionData: {
              sdp: offer.sdp,
              type: offer.type
            },
            timestamp: new Date()
          });
          break;

        case 'offer':
          console.log('Received offer');
          if (!this.peerConnection) {
            const localStream = await this.getLocalStream();
            await this.initializePeerConnection(localStream);
          }

          if (message.sessionData.sdp && message.sessionData.type) {
            await this.peerConnection!.setRemoteDescription(
              new RTCSessionDescription({
                sdp: message.sessionData.sdp,
                type: message.sessionData.type
              })
            );

            console.log('Remote description set, creating answer');
            const answer = await this.peerConnection!.createAnswer();
            await this.peerConnection!.setLocalDescription(answer);

            // Traiter les candidats ICE en attente après avoir établi les descriptions
            console.log('Processing pending ICE candidates:', this.pendingIceCandidates.length);
            while (this.pendingIceCandidates.length > 0) {
              const candidate = this.pendingIceCandidates.shift();
              if (candidate) {
                try {
                  await this.peerConnection!.addIceCandidate(new RTCIceCandidate(candidate));
                  console.log('Successfully added pending ICE candidate');
                } catch (e) {
                  console.warn('Failed to add pending ICE candidate:', e);
                }
              }
            }

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
          console.log('Received answer');
          if (message.sessionData.sdp && message.sessionData.type && this.peerConnection) {
            await this.peerConnection.setRemoteDescription(
              new RTCSessionDescription({
                sdp: message.sessionData.sdp,
                type: message.sessionData.type
              })
            );

            // Traiter les candidats ICE en attente après avoir établi les descriptions
            console.log('Processing pending ICE candidates:', this.pendingIceCandidates.length);
            while (this.pendingIceCandidates.length > 0) {
              const candidate = this.pendingIceCandidates.shift();
              if (candidate) {
                try {
                  await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                  console.log('Successfully added pending ICE candidate');
                } catch (e) {
                  console.warn('Failed to add pending ICE candidate:', e);
                }
              }
            }
          }
          break;

        case 'ice-candidate':
          console.log('Received ICE candidate');
          if (message.sessionData.candidate) {
            if (!this.peerConnection || !this.peerConnection.remoteDescription) {
              console.log('Queuing ICE candidate for later');
              this.pendingIceCandidates.push(message.sessionData.candidate);
            } else {
              try {
                await this.peerConnection.addIceCandidate(
                  new RTCIceCandidate(message.sessionData.candidate)
                );
                console.log('Successfully added ICE candidate:', message.sessionData.candidate.candidate);
              } catch (e) {
                console.warn('Failed to add ICE candidate, queuing for later:', e);
                this.pendingIceCandidates.push(message.sessionData.candidate);
              }
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
      throw error;
    }
  }

  private async sendSignalingMessage(message: RTCSignalingMessage): Promise<void> {
    console.log('Preparing to send signaling message:', message);
    try {
      if (message.from === message.to) {
        console.error('Tentative d\'envoi d\'un message à soi-même');
        return;
      }

      // Utiliser un ID unique pour chaque message
      const messageId = `${Date.now()}_${message.from}_${message.to}`;
      const messageDoc = doc(this.firestore, 'rtcSignaling', messageId);
      
      // Convertir la date en Timestamp Firestore
      const messageWithTimestamp = {
        ...message,
        timestamp: new Date()
      };

      console.log('Writing message to Firestore:', messageId, messageWithTimestamp);
      await setDoc(messageDoc, messageWithTimestamp);
      console.log('Message sent successfully:', messageId);

      // Vérifier immédiatement que le message a été écrit
      const docSnap = await getDoc(messageDoc);
      if (docSnap.exists()) {
        console.log('Message verified in Firestore:', docSnap.data());
      } else {
        console.error('Message not found after writing!');
      }
    } catch (error) {
      console.error('Error sending signaling message:', error);
      throw error;
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
      this.pendingIceCandidates = [];
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

      // Nettoyer les messages de signalisation
      const user = await this.authService.user$.pipe(take(1)).toPromise();
      if (user) {
        const rtcSignalingRef = collection(this.firestore, 'rtcSignaling');
        const q = query(rtcSignalingRef, 
          where('to', '==', user.uid));
        const snapshot = await getDocs(q);
        for (const doc of snapshot.docs) {
          await deleteDoc(doc.ref);
        }
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

  async acceptCall(sessionId: string, callerId: string): Promise<void> {
    try {
      const user = await this.authService.user$.pipe(take(1)).toPromise();
      if (!user) throw new Error('User not authenticated');

      console.log('Accepting call from:', callerId);
      this.currentSessionId = sessionId;

      // Obtenir le flux local avant d'initialiser la connexion
      const localStream = await this.getLocalStream();
      console.log('Local stream obtained:', localStream.getTracks().map(t => t.kind));

      // Initialiser la connexion avec le flux local
      await this.initializePeerConnection(localStream);

      await this.updateUserStatus('in-call');

      // Envoyer l'acceptation
      await this.sendSignalingMessage({
        type: 'call-accepted',
        from: user.uid,
        to: callerId,
        sessionData: {},
        timestamp: new Date()
      });

      this.incomingCallSubject.next(null);

      // Vérifier périodiquement l'état de la connexion
      const checkInterval = setInterval(() => {
        this.checkConnectionState();
        if (!this.callStateSubject.value.isInCall) {
          clearInterval(checkInterval);
        }
      }, 1000);

    } catch (error) {
      console.error('Error accepting call:', error);
      this.endCall();
    }
  }

  rejectCall(): void {
    this.incomingCallSubject.next(null);
    // Optionnel : envoyer un message de rejet au appelant
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

  private checkStreamsState(): void {
    const currentState = this.callStateSubject.value;
    console.log('Checking streams state:', {
      hasLocalStream: !!currentState.localStream,
      hasRemoteStream: !!currentState.remoteStream,
      localTracks: currentState.localStream?.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        muted: t.muted
      })),
      remoteTracks: currentState.remoteStream?.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        muted: t.muted
      }))
    });

    if (currentState.localStream && currentState.remoteStream) {
      console.log('Both streams are present, connection should be established');
    }
  }

  private checkConnectionState(): void {
    if (this.peerConnection) {
      const state = {
        iceConnectionState: this.peerConnection.iceConnectionState,
        connectionState: this.peerConnection.connectionState,
        signalingState: this.peerConnection.signalingState,
        hasLocalStream: !!this.callStateSubject.value.localStream,
        hasRemoteStream: !!this.callStateSubject.value.remoteStream,
        localTracks: this.callStateSubject.value.localStream?.getTracks().length || 0,
        remoteTracks: this.callStateSubject.value.remoteStream?.getTracks().length || 0
      };
      
      console.log('Connection state:', state);

      if (state.connectionState === 'connected' && (!state.hasLocalStream || !state.hasRemoteStream)) {
        console.warn('Connection established but streams are missing');
        this.checkStreamsState();
      }
    }
  }

  private async restartConnection(): Promise<void> {
    console.log('Attempting to restart connection');
    if (this.peerConnection) {
      try {
        const offer = await this.peerConnection.createOffer({ iceRestart: true });
        await this.peerConnection.setLocalDescription(offer);
        
        const user = await this.authService.user$.pipe(take(1)).toPromise();
        if (!user || !this.currentSessionId) return;

        const [caller, callee] = this.currentSessionId.split('_');
        const targetUserId = user.uid === caller ? callee : caller;

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
        console.error('Error restarting connection:', error);
      }
    }
  }

  private async restartIceConnection(): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const user = await this.authService.user$.pipe(take(1)).toPromise();
      if (!user || !this.currentSessionId) return;

      console.log('Restarting ICE connection');
      
      // Créer une nouvelle offre avec iceRestart: true
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);

      const [caller, callee] = this.currentSessionId.split('_');
      const targetUserId = user.uid === caller ? callee : caller;

      // Envoyer la nouvelle offre
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

      console.log('ICE restart offer sent');
    } catch (error) {
      console.error('Error restarting ICE connection:', error);
    }
  }
}


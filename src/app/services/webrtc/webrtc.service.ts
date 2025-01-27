import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, take, distinctUntilChanged, combineLatest } from 'rxjs';
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
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CallingDialogComponent } from '../../components/calls/calling-dialog.component';

export interface OnlineUser {
  id: string;
  name: string;
  role: 'medecin' | 'infirmier';
  status: 'online' | 'in-call' | 'offline';
  lastSeen: Date;
  nom: string;
  prenom: string;
  specialite?: string;
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
  isRemoteSpeaking: boolean;
}

export interface IncomingCall {
  sessionId: string;
  callerId: string;
  callerName: string;
  callerRole: string;
}

export interface RemoteUserInfo {
  name: string;
  role: string;
}

interface RTCSignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-request' | 'call-accepted' | 'call-rejected';
  from: string;
  to: string;
  sessionData: {
    sdp?: string;
    type?: RTCSdpType;
    candidate?: RTCIceCandidateInit;
    callerName?: string;
    callerRole?: string;
  };
  timestamp: Date;
}

interface MediaPermissionStatus {
  video: boolean;
  audio: boolean;
  error?: string;
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
    callStartTime: null,
    isRemoteSpeaking: false
  });

  readonly callState$ = this.callStateSubject.asObservable();

  private readonly configuration: RTCConfiguration = {
    iceServers: [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302'
        ]
      }
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };

  private incomingCallSubject = new BehaviorSubject<IncomingCall | null>(null);
  readonly incomingCall$ = this.incomingCallSubject.asObservable();

  private remoteStream = new BehaviorSubject<MediaStream | null>(null);
  private remoteUserInfo$ = new BehaviorSubject<RemoteUserInfo | null>(null);
  private callDuration$ = new BehaviorSubject<string>('00:00');
  private callTimer: any;
  private activeDialog: MatDialogRef<any> | null = null;

  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private dialog: MatDialog
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
      callStartTime: null,
      isRemoteSpeaking: false
    });
    this.incomingCallSubject.next(null);
  }

  getOnlineUsers(): Observable<OnlineUser[]> {
    return new Observable<OnlineUser[]>(observer => {
      const personnelRef = collection(this.firestore, 'personnel');
      
      const userSub = this.authService.user$.subscribe(currentUser => {
        if (!currentUser) {
          observer.next([]);
          return;
        }

        console.log('Current user:', currentUser);

        const snapshotSub = onSnapshot(personnelRef, async (snapshot) => {
          const users = await Promise.all(snapshot.docs.map(async doc => {
            const personnelData = doc.data();
            console.log('Personnel data for', doc.id, ':', personnelData);
            
            return {
              id: doc.id,
              name: personnelData['name'] || '',
              role: personnelData['role'] as 'medecin' | 'infirmier',
              nom: personnelData['nom'] || '',
              prenom: personnelData['prenom'] || '',
              specialite: personnelData['specialite'],
              status: personnelData['isAvailable'] ? 'online' : 'offline',
              lastSeen: personnelData['lastActive']
            } as OnlineUser;
          }));

          // Filtrer les utilisateurs selon le rôle de l'utilisateur courant
          const filteredUsers = users.filter(user => {
            // Ne pas afficher l'utilisateur courant
            if (user.id === currentUser.uid) {
              console.log('Filtering out current user:', user);
              return false;
            }

            // Vérifier si l'utilisateur est disponible
            const isAvailable = user.status === 'online';
            console.log('User availability check:', user.nom, isAvailable);

            // Si l'utilisateur est un médecin, ne montrer que les infirmiers disponibles
            if (currentUser.role === 'medecin') {
              return user.role === 'infirmier' && isAvailable;
            }
            
            // Si l'utilisateur est un infirmier, ne montrer que les médecins disponibles
            if (currentUser.role === 'infirmier') {
              return user.role === 'medecin' && isAvailable;
            }

            return false;
          });

          console.log('Filtered users:', filteredUsers);
          observer.next(filteredUsers);
        });

        return () => {
          snapshotSub();
          userSub.unsubscribe();
        };
      });
    });
  }

  public async checkAndRequestPermissions(): Promise<MediaPermissionStatus> {
    try {
      // Vérifier si les permissions sont déjà accordées
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasExistingPermissions = devices.some(device => device.label !== '');

      if (!hasExistingPermissions) {
        console.log('Requesting media permissions...');
        // Demander les permissions explicitement
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        // Arrêter immédiatement le stream de test
        stream.getTracks().forEach(track => track.stop());
        
        return { video: true, audio: true };
      }

      // Vérifier les permissions individuellement
      const videoPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      const audioPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });

      return {
        video: videoPermission.state === 'granted',
        audio: audioPermission.state === 'granted'
      };
    } catch (error: unknown) {
      console.error('Error checking permissions:', error);
      return {
        video: false,
        audio: false,
        error: error instanceof Error ? error.message : 'Une erreur inconnue est survenue'
      };
    }
  }

  private async getLocalStream(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Vérifier que les tracks sont bien activés
      stream.getTracks().forEach(track => {
        console.log(`Track ${track.kind} enabled:`, track.enabled);
        track.enabled = true;
      });

      return stream;
    } catch (error: unknown) {
      console.error('Error accessing media devices:', error);
      throw new Error(
        `Impossible d'accéder aux périphériques média: ${
          error instanceof Error ? error.message : 'Erreur inconnue'
        }`
      );
    }
  }

  async startCall(targetUserId: string): Promise<void> {
    try {
      const user = await this.authService.user$.pipe(take(1)).toPromise();
      if (!user) throw new Error('User not authenticated');

      // Afficher le dialogue d'appel en cours
      this.activeDialog = this.dialog.open(CallingDialogComponent, {
        data: {
          callerName: `${user.nom} ${user.prenom}`,
          callerRole: user.role,
          isOutgoing: true
        },
        disableClose: true,
        width: '400px'
      });

      // Gérer la fermeture du dialogue (annulation de l'appel)
      this.activeDialog.afterClosed().subscribe(async (result) => {
        if (!result) {
          await this.cancelCall(targetUserId);
        }
      });

      // Envoyer la demande d'appel
      await this.sendSignalingMessage({
        type: 'call-request',
        from: user.uid,
        to: targetUserId,
        sessionData: {
          callerName: `${user.nom} ${user.prenom}`,
          callerRole: user.role
        },
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error starting call:', error);
      this.closeActiveDialog();
    }
  }

  private async handleIncomingCall(message: RTCSignalingMessage): Promise<void> {
    const user = await this.authService.user$.pipe(take(1)).toPromise();
    if (!user) return;

    const sessionId = `${message.from}_${user.uid}`;

    // Fermer tout dialogue actif existant
    this.closeActiveDialog();

    // Afficher le dialogue d'appel entrant
    this.activeDialog = this.dialog.open(CallingDialogComponent, {
      data: {
        callerName: message.sessionData.callerName || 'Unknown',
        callerRole: message.sessionData.callerRole || 'Unknown',
        isOutgoing: false
      },
      disableClose: true,
      width: '400px'
    });

    this.activeDialog.afterClosed().subscribe(async (accepted) => {
      if (accepted) {
        await this.acceptCall(sessionId, message.from);
      } else {
        await this.rejectCall();
      }
    });

    this.incomingCallSubject.next({
      sessionId: sessionId,
      callerId: message.from,
      callerName: message.sessionData.callerName || 'Unknown',
      callerRole: message.sessionData.callerRole || 'Unknown'
    });
  }

  private async handleLocalIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    try {
      const user = await this.authService.user$.pipe(take(1)).toPromise();
      if (!user || !this.currentSessionId) return;

      const [caller, callee] = this.currentSessionId.split('_');
      const targetUserId = user.uid === caller ? callee : caller;

      await this.sendSignalingMessage({
        type: 'ice-candidate',
        from: user.uid,
        to: targetUserId,
        sessionData: {
          candidate: candidate.toJSON()
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error handling local ICE candidate:', error);
    }
  }

  private async initializePeerConnection(localStream: MediaStream): Promise<void> {
    if (this.peerConnection) {
      console.log('Closing existing peer connection');
      this.peerConnection.close();
    }

    console.log('Initializing new peer connection');
    this.peerConnection = new RTCPeerConnection({
      ...this.configuration,
      iceCandidatePoolSize: 0
    });

    // Configurer les événements avant d'ajouter les tracks
    this.setupPeerConnectionEvents();

    // Ajouter les tracks une seule fois
    console.log('Adding tracks to peer connection');
    localStream.getTracks().forEach(track => {
      try {
        if (track.kind === 'audio') {
          console.log('Adding audio track');
          const sender = this.peerConnection!.addTrack(track, localStream);
          this.configureAudioTrack(sender);
        } else if (track.kind === 'video') {
          console.log('Adding video track');
          const sender = this.peerConnection!.addTrack(track, localStream);
          this.configureVideoTrack(sender);
        }
      } catch (error) {
        console.error(`Error adding ${track.kind} track:`, error);
      }
    });

    // Mettre à jour l'état
    this.updateCallState({
      localStream,
      isInCall: true
    });

    console.log('Peer connection initialization completed');
  }

  private configureAudioTrack(sender: RTCRtpSender): void {
    try {
      const parameters = sender.getParameters();
      parameters.encodings = [{
        priority: 'high',
        maxBitrate: 128000,
        networkPriority: 'high'
      }];

      // Optimiser les paramètres audio sans utiliser les propriétés non supportées
      const transceiver = this.peerConnection?.getTransceivers()
        .find(t => t.sender === sender);
      
      if (transceiver) {
        transceiver.setCodecPreferences(
          RTCRtpSender.getCapabilities('audio')!.codecs
            .filter(codec => 
              codec.mimeType.toLowerCase() === 'audio/opus')
            .map(codec => ({
              ...codec,
              clockRate: 48000,
            }))
        );
      }

      sender.setParameters(parameters)
        .then(() => console.log('Audio parameters set successfully'))
        .catch(e => console.warn('Could not set audio parameters:', e));

      // Configurer la qualité audio via les contraintes
      if (sender.track) {
        sender.track.applyConstraints({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000
        }).catch(e => console.warn('Could not apply audio constraints:', e));
      }

    } catch (e) {
      console.error('Error configuring audio track:', e);
    }
  }

  private configureVideoTrack(sender: RTCRtpSender): void {
    try {
      const parameters = sender.getParameters();
      parameters.encodings = [{
        priority: 'high',
        maxBitrate: 2500000, // Augmenter le bitrate pour une meilleure qualité
        maxFramerate: 30,
        scaleResolutionDownBy: 1.0
      }];

      sender.setParameters(parameters)
        .then(() => console.log('Video parameters set successfully'))
        .catch(e => console.warn('Could not set video parameters:', e));

      if (sender.track) {
        sender.track.enabled = true;
        console.log('Video track enabled:', sender.track.enabled);
      }
    } catch (e) {
      console.error('Error configuring video track:', e);
    }
  }

  private setupAudioAnalyzer(stream: MediaStream): void {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    analyser.fftSize = 256;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkAudioLevel = () => {
      if (!this.callStateSubject.value.isInCall) return;
      
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      
      const isSpeaking = average > 30; // Ajuster ce seuil selon vos besoins
      
      if (this.callStateSubject.value.isRemoteSpeaking !== isSpeaking) {
        this.updateCallState({ isRemoteSpeaking: isSpeaking });
      }
      
      requestAnimationFrame(checkAudioLevel);
    };
    
    checkAudioLevel();
  }

  private setupPeerConnectionEvents(): void {
    if (!this.peerConnection) return;

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('New ICE candidate:', {
          type: event.candidate.type,
          protocol: event.candidate.protocol,
          address: event.candidate.address,
          port: event.candidate.port
        });
        this.handleLocalIceCandidate(event.candidate);
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        
        // Configurer l'analyseur audio pour le flux distant
        if (event.track.kind === 'audio') {
          this.setupAudioAnalyzer(remoteStream);
        }

        // Configuration spécifique pour l'audio
        remoteStream.getAudioTracks().forEach(track => {
          track.enabled = true;
          console.log('Remote audio track enabled:', track.enabled);
          console.log('Remote audio track settings:', track.getSettings());
          
          // Optimiser la qualité audio
          track.applyConstraints({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 48000
          }).catch(e => console.warn('Could not apply remote audio constraints:', e));

          // Écouter les changements d'état de la piste audio
          track.onmute = () => {
            console.log('Remote audio track muted');
            track.enabled = true;
          };
          
          track.onunmute = () => {
            console.log('Remote audio track unmuted');
            track.enabled = true;
          };
        });

        // Mettre à jour l'état
        this.updateCallState({
          remoteStream,
          isInCall: true
        });

        // Vérifier périodiquement l'état des pistes audio
        this.startAudioCheck(remoteStream);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('ICE connection state changed:', state);
      
      switch (state) {
        case 'checking':
          console.log('Checking ICE candidates...');
          break;
        case 'connected':
          console.log('ICE connection established successfully');
          this.checkStreamsState();
          break;
        case 'failed':
          console.error('ICE connection failed - details:', {
            iceGatheringState: this.peerConnection?.iceGatheringState,
            signalingState: this.peerConnection?.signalingState,
            connectionState: this.peerConnection?.connectionState
          });
          this.tryFallbackStunServer();
          break;
        case 'disconnected':
          console.warn('ICE connection disconnected - attempting reconnection');
          this.tryFallbackStunServer();
          break;
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('Connection state changed:', state);
      
      if (state === 'connected') {
        // Vérifier et optimiser la qualité audio périodiquement
        const audioQualityInterval = setInterval(() => {
          if (!this.callStateSubject.value.isInCall) {
            clearInterval(audioQualityInterval);
            return;
          }

          const audioTracks = this.peerConnection?.getSenders()
            .filter(sender => sender.track?.kind === 'audio');
            
          audioTracks?.forEach(sender => {
            const params = sender.getParameters();
            if (params.encodings?.[0]) {
              params.encodings[0].maxBitrate = 128000;
              params.encodings[0].priority = 'high';
              sender.setParameters(params)
                .catch(e => console.warn('Failed to update audio parameters:', e));
            }
          });
        }, 5000);
      }
    };
  }

  private startAudioCheck(remoteStream: MediaStream): void {
    const audioCheckInterval = setInterval(() => {
      if (!this.callStateSubject.value.isInCall) {
        clearInterval(audioCheckInterval);
        return;
      }

      remoteStream.getAudioTracks().forEach(track => {
        if (!track.enabled) {
          console.log('Re-enabling audio track');
          track.enabled = true;
        }
        
        // Vérifier les statistiques audio
        if (this.peerConnection) {
          this.peerConnection.getStats(track).then(stats => {
            stats.forEach(report => {
              if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                console.log('Audio stats:', {
                  packetsReceived: report.packetsReceived,
                  packetsLost: report.packetsLost,
                  jitter: report.jitter
                });
              }
            });
          });
        }
      });
    }, 1000);
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
            this.handleIncomingCall(message);
          }
          break;

        case 'call-accepted':
          console.log('Call accepted by:', message.from);
          if (!this.peerConnection) {
            const localStream = await this.getLocalStream();
            await this.initializePeerConnection(localStream);
            
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
          }
          break;

        case 'offer':
          console.log('Received offer, current signaling state:', this.peerConnection?.signalingState);
    if (!this.peerConnection) {
      const localStream = await this.getLocalStream();
      await this.initializePeerConnection(localStream);
    }

          if (message.sessionData.sdp && message.sessionData.type) {
            if (this.peerConnection?.signalingState === 'stable' || 
                this.peerConnection?.signalingState === 'have-local-offer') {
            await this.peerConnection!.setRemoteDescription(
              new RTCSessionDescription({
                sdp: message.sessionData.sdp,
                type: message.sessionData.type
              })
            );

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

              await this.processPendingIceCandidates();
            } else {
              console.warn('Invalid signaling state for offer:', this.peerConnection?.signalingState);
            }
          }
          break;

        case 'answer':
          console.log('Received answer, current signaling state:', this.peerConnection?.signalingState);
          if (this.peerConnection) {
            if (this.peerConnection.signalingState === 'have-local-offer') {
          if (message.sessionData.sdp && message.sessionData.type) {
                await this.peerConnection.setRemoteDescription(
              new RTCSessionDescription({
                sdp: message.sessionData.sdp,
                type: message.sessionData.type
              })
            );
                console.log('Remote description set successfully');
                await this.processPendingIceCandidates();
              }
            } else {
              console.warn('Ignoring answer in invalid state:', this.peerConnection.signalingState);
              await this.tryFallbackStunServer();
            }
          } else {
            console.warn('No peer connection when receiving answer');
          }
          break;

        case 'ice-candidate':
          await this.handleIceCandidate(message);
          break;

        case 'call-rejected':
          console.log('Call rejected by:', message.from);
          this.incomingCallSubject.next(null);
          this.currentSessionId = null;
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
      if (error instanceof DOMException && error.name === 'InvalidStateError') {
        console.log('Invalid state, attempting to restart connection');
        await this.tryFallbackStunServer();
      } else {
        throw error;
      }
    }
  }

  private async handleIceCandidate(message: RTCSignalingMessage): Promise<void> {
    if (!message.sessionData.candidate) return;

    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      console.log('Queuing ICE candidate for later');
      this.pendingIceCandidates.push(message.sessionData.candidate);
      return;
    }

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

  private async processPendingIceCandidates(): Promise<void> {
    console.log('Processing pending ICE candidates:', this.pendingIceCandidates.length);
    while (this.pendingIceCandidates.length > 0) {
      const candidate = this.pendingIceCandidates.shift();
      if (candidate && this.peerConnection) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('Successfully added pending ICE candidate');
        } catch (e) {
          console.warn('Failed to add pending ICE candidate:', e);
        }
      }
    }
  }

  private async sendSignalingMessage(message: RTCSignalingMessage): Promise<void> {
    console.log('Preparing to send signaling message:', message);
    try {
      if (message.from === message.to) {
        console.error('Tentative d\'envoi d\'un message à soi-même');
        return;
      }

      const messageId = `${Date.now()}_${message.from}_${message.to}`;
      const messageDoc = doc(this.firestore, 'rtcSignaling', messageId);
      
      const messageWithTimestamp = {
        ...message,
        timestamp: new Date()
      };

      console.log('Writing message to Firestore:', messageId, messageWithTimestamp);
      await setDoc(messageDoc, messageWithTimestamp);
      console.log('Message sent successfully:', messageId);

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
      const personnelDoc = doc(this.firestore, 'personnel', user.uid);
      await updateDoc(personnelDoc, {
        isAvailable: status === 'online',
        lastActive: new Date()
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
        callStartTime: null,
        isRemoteSpeaking: false
      });

      await this.updateUserStatus('online');
      this.stopCallTimer();

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
      // S'assurer que le dialogue est fermé avant de continuer
      this.closeActiveDialog();
      this.incomingCallSubject.next(null); // Réinitialiser l'état d'appel entrant

      const user = await this.authService.user$.pipe(take(1)).toPromise();
      if (!user) throw new Error('User not authenticated');

      console.log('Accepting call from:', callerId);
      this.currentSessionId = sessionId;

      const localStream = await this.getLocalStream();
      console.log('Local stream obtained:', localStream.getTracks().map(t => t.kind));

      await this.initializePeerConnection(localStream);

      await this.updateUserStatus('in-call');

      await this.sendSignalingMessage({
        type: 'call-accepted',
        from: user.uid,
        to: callerId,
        sessionData: {},
        timestamp: new Date()
      });

      this.incomingCallSubject.next(null);

      const checkInterval = setInterval(() => {
        this.checkConnectionState();
        if (!this.callStateSubject.value.isInCall) {
          clearInterval(checkInterval);
        }
      }, 1000);

      this.startCallTimer();

    } catch (error) {
      console.error('Error accepting call:', error);
      this.closeActiveDialog();
      this.endCall();
    }
  }

  rejectCall(): void {
    this.closeActiveDialog();
    this.incomingCallSubject.next(null);
  }

  private checkStreamsState(): void {
    const currentState = this.callStateSubject.value;
    console.log('Checking streams state:', {
      hasLocalStream: !!currentState.localStream,
      hasRemoteStream: !!currentState.remoteStream,
      localTracks: currentState.localStream?.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState
      })),
      remoteTracks: currentState.remoteStream?.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState
      }))
    });

    if (currentState.remoteStream) {
      currentState.remoteStream.getTracks().forEach(track => {
        if (!track.enabled) {
          console.log(`Enabling remote ${track.kind} track`);
          track.enabled = true;
        }
      });
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

  private async tryFallbackStunServer(): Promise<void> {
    if (!this.peerConnection) return;

    console.log('Trying fallback STUN server');
    
    const fallbackConfig = {
      ...this.configuration,
      iceServers: [
        {
          urls: [
            'stun:stun.stunprotocol.org:3478',
            'stun:stun.voip.blackberry.com:3478',
            'stun:stun.voipgate.com:3478'
          ]
        }
      ]
    };

    try {
      this.peerConnection.setConfiguration(fallbackConfig);
      await this.restartIceConnection();
    } catch (error) {
      console.error('Error using fallback STUN server:', error);
    }
  }

  private async restartIceConnection(): Promise<void> {
    if (!this.peerConnection) return;

    try {
      console.log('Restarting ICE connection');
      
      const currentConfig = this.peerConnection.getConfiguration();
      this.peerConnection.setConfiguration({
        ...currentConfig,
        iceTransportPolicy: 'relay'
      });

      const offer = await this.peerConnection.createOffer({ 
        iceRestart: true,
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
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

      console.log('ICE restart offer sent');
    } catch (error) {
      console.error('Error restarting ICE connection:', error);
    }
  }

  getRemoteUserInfo$(): Observable<RemoteUserInfo | null> {
    return this.remoteUserInfo$.asObservable();
  }

  getRemoteAudioStream(): Observable<MediaStream | null> {
    return this.remoteStream.asObservable();
  }

  toggleAudio(muted: boolean) {
    const audioTracks = this.localStreamSubject.value?.getAudioTracks();
    if (audioTracks && audioTracks.length > 0) {
      audioTracks.forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  toggleVideo(disabled: boolean) {
    const videoTracks = this.localStreamSubject.value?.getVideoTracks();
    if (videoTracks && videoTracks.length > 0) {
      videoTracks.forEach(track => {
        track.enabled = !disabled;
      });
    }
  }

  private updateRemoteUserInfo(userId: string) {
    const userRef = doc(this.firestore, 'personnel', userId);
    getDoc(userRef).then(docSnap => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        this.remoteUserInfo$.next({
          name: `${userData['nom']} ${userData['prenom']}`,
          role: userData['role']
        });
      }
    });
  }

  private async handleAnswer(answer: RTCSessionDescription, userId: string) {
    try {
      await this.peerConnection?.setRemoteDescription(answer);
      this.updateRemoteUserInfo(userId);
    } catch (error) {
      console.error('Erreur lors du traitement de la réponse:', error);
    }
  }

  private handleTrack(event: RTCTrackEvent) {
    console.log('Nouveau flux distant reçu:', event.streams[0]);
    this.remoteStream.next(event.streams[0]);
  }

  getCallDuration$(): Observable<string> {
    return this.callDuration$.asObservable();
  }

  private startCallTimer() {
    let seconds = 0;
    this.callTimer = setInterval(() => {
      seconds++;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      this.callDuration$.next(
        `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
      );
    }, 1000);
  }

  private stopCallTimer() {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callDuration$.next('00:00');
    }
  }

  private async cancelCall(targetUserId: string): Promise<void> {
    try {
      this.closeActiveDialog();
      const user = await this.authService.user$.pipe(take(1)).toPromise();
      if (!user) return;

      // Envoyer un message de rejet d'appel
      await this.sendSignalingMessage({
        type: 'call-rejected',
        from: user.uid,
        to: targetUserId,
        sessionData: {},
        timestamp: new Date()
      });

      // Réinitialiser l'état
      this.incomingCallSubject.next(null);
      this.currentSessionId = null;

    } catch (error) {
      console.error('Error canceling call:', error);
    }
  }

  private closeActiveDialog(): void {
    if (this.activeDialog) {
      console.log('Closing active dialog');
      this.activeDialog.close();
      this.activeDialog = null;
    }
  }
}


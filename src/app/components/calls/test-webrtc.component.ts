import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { WebRTCService, IncomingCall } from '../../services/webrtc/webrtc.service';
import { AuthService } from '../../services/auth/auth.service';
import { take } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-webrtc-test',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule],
  template: `
    <div class="test-container">
      <mat-card class="test-card">
        <mat-card-header>
          <mat-card-title>Test WebRTC (Interface Infirmier)</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <div class="video-container">
            <video #localVideo autoplay playsinline muted class="local-video"></video>
            <video #remoteVideo autoplay playsinline class="remote-video"></video>
          </div>

          <div class="controls">
            <ng-container *ngIf="webRTCService.incomingCall$ | async as incomingCall">
              <button mat-raised-button color="primary" (click)="acceptCall(incomingCall)">
                Accepter l'appel
              </button>
              <button mat-raised-button color="warn" (click)="rejectCall()">
                Refuser
              </button>
            </ng-container>

            <button mat-raised-button color="warn" 
                    *ngIf="(webRTCService.callState$ | async)?.isInCall"
                    (click)="endCall()">
              Terminer l'appel
            </button>
          </div>

          <div class="status">
            <ng-container *ngIf="webRTCService.incomingCall$ | async as incomingCall">
              Appel entrant du Dr. {{incomingCall?.callerName || 'Inconnu'}}...
            </ng-container>
            <ng-container *ngIf="(webRTCService.callState$ | async)?.isInCall">
              En appel
            </ng-container>
            <ng-container *ngIf="!(webRTCService.incomingCall$ | async) && !(webRTCService.callState$ | async)?.isInCall">
              En attente d'appel
            </ng-container>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .test-container {
      padding: 20px;
      display: flex;
      justify-content: center;
    }

    .test-card {
      max-width: 800px;
      width: 100%;
    }

    .video-container {
      display: flex;
      gap: 20px;
      margin: 20px 0;
    }

    .local-video, .remote-video {
      width: 320px;
      height: 240px;
      background: #000;
      border-radius: 8px;
    }

    .controls {
      display: flex;
      gap: 10px;
      margin: 20px 0;
    }

    .status {
      margin-top: 20px;
      font-weight: bold;
    }
  `]
})
export class WebRTCTestComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;
  
  private callStateSubscription?: Subscription;
  private authSubscription?: Subscription;

  constructor(
    public webRTCService: WebRTCService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Vérifier l'état de l'authentification
    this.authSubscription = this.authService.user$.subscribe(user => {
      console.log('Test interface - Current user:', user?.uid);
      if (!user) {
        console.warn('No user authenticated in test interface');
      }
    });

    this.callStateSubscription = this.webRTCService.callState$.subscribe(state => {
      console.log('Call state updated:', state);
      if (state.localStream && this.localVideo) {
        console.log('Setting local video stream');
        this.localVideo.nativeElement.srcObject = state.localStream;
      }
      if (state.remoteStream && this.remoteVideo) {
        console.log('Setting remote video stream');
        this.remoteVideo.nativeElement.srcObject = state.remoteStream;
      }
    });
  }

  ngOnDestroy() {
    this.callStateSubscription?.unsubscribe();
    this.authSubscription?.unsubscribe();
    this.endCall();
  }

  async acceptCall(incomingCall: IncomingCall) {
    console.log('Accepting call:', incomingCall);
    await this.webRTCService.acceptCall(incomingCall.sessionId, incomingCall.callerId);
  }

  rejectCall() {
    console.log('Rejecting call');
    this.webRTCService.rejectCall();
  }

  endCall() {
    console.log('Ending call');
    this.webRTCService.endCall();
    if (this.localVideo) {
      this.localVideo.nativeElement.srcObject = null;
    }
    if (this.remoteVideo) {
      this.remoteVideo.nativeElement.srcObject = null;
    }
  }
}

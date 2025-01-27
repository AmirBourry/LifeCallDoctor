import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { WebRTCService } from '../../services/webrtc/webrtc.service';
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
          <mat-card-title>Test WebRTC</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <div class="video-container">
            <video #localVideo autoplay playsinline muted class="local-video"></video>
            <video #remoteVideo autoplay playsinline class="remote-video"></video>
          </div>

          <div class="controls">
            <button mat-raised-button color="primary" (click)="initiateCall()">
              Démarrer l'appel test
            </button>
            <button mat-raised-button color="warn" (click)="endCall()">
              Terminer l'appel
            </button>
          </div>

          <div class="status">
            État de l'appel: {{(webRTCService.callState$ | async)?.isInCall ? 'En appel' : 'Pas d\'appel'}}
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

  constructor(
    public webRTCService: WebRTCService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.callStateSubscription = this.webRTCService.callState$.subscribe(state => {
      if (state.localStream && this.localVideo) {
        this.localVideo.nativeElement.srcObject = state.localStream;
      }
      if (state.remoteStream && this.remoteVideo) {
        this.remoteVideo.nativeElement.srcObject = state.remoteStream;
      }
    });
  }

  ngOnDestroy() {
    this.callStateSubscription?.unsubscribe();
    this.endCall();
  }

  async initiateCall() {
    const user = await this.authService.user$.pipe(take(1)).toPromise();
    if (user) {
      this.webRTCService.startCall(user.uid);
    } else {
      console.error('Aucun utilisateur connecté');
    }
  }

  endCall() {
    this.webRTCService.endCall();
    if (this.localVideo) {
      this.localVideo.nativeElement.srcObject = null;
    }
    if (this.remoteVideo) {
      this.remoteVideo.nativeElement.srcObject = null;
    }
  }
}

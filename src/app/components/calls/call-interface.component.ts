import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatBadgeModule } from '@angular/material/badge';
import { WebRTCService } from '../../services/webrtc/webrtc.service';
import { FlexModule } from '@ngbracket/ngx-layout';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-call-interface',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatRippleModule,
    MatBadgeModule,
    FlexModule
  ],
  template: `
    <div class="call-container" *ngIf="webRTCService.callState$ | async as callState">
      <div class="video-container">
        <!-- Remote Video -->
        <div class="remote-video-container">
          <video #remoteVideo
                 class="remote-video"
                 [class.audio-only]="callState.isAudioOnly"
                 [class.hidden]="!callState.remoteStream"
                 [srcObject]="callState.remoteStream"
                 autoplay
                 playsinline>
          </video>
          <div class="speaking-indicator" *ngIf="callState.isRemoteSpeaking">
            <mat-icon>mic</mat-icon>
          </div>
        </div>

        <!-- Local Video -->
        <video #localVideo
               class="local-video"
               [class.hidden]="callState.isCameraOff || !callState.localStream"
               autoplay
               playsinline
               muted>
        </video>

        <!-- Audio Only Placeholder -->
        <div class="audio-only-placeholder" 
             *ngIf="callState.isAudioOnly || !callState.remoteStream">
          <mat-icon>account_circle</mat-icon>
          <h3>{{callState.remotePeerName || 'En attente de connexion...'}}</h3>
          <div class="audio-wave" *ngIf="callState.remoteStream">
            <div class="wave-bar" *ngFor="let i of [1,2,3,4,5]"></div>
          </div>
        </div>

        <!-- Vitals Overlay -->
        <div class="vitals-overlay">
          <div class="vital-sign">
            <span class="label">SpO2</span>
            <span class="value">98%</span>
          </div>
          <div class="vital-sign">
            <span class="label">BPM</span>
            <span class="value">72</span>
          </div>
          <div class="vital-sign">
            <span class="label">BP</span>
            <span class="value">120/80</span>
          </div>
          <div class="vital-sign">
            <span class="label">Temp</span>
            <span class="value">37.2°C</span>
          </div>
        </div>

        <!-- Call Duration -->
        <div class="call-duration">
          {{formatDuration(callState.callStartTime)}}
        </div>
      </div>

      <!-- Call Controls -->
      <div class="call-controls">
        <button mat-fab
                [class.muted]="callState.isMuted"
                (click)="webRTCService.toggleMute()">
          <mat-icon>{{callState.isMuted ? 'mic_off' : 'mic'}}</mat-icon>
        </button>

        <button mat-fab
                color="warn"
                class="end-call-button"
                (click)="webRTCService.endCall()">
          <mat-icon>call_end</mat-icon>
        </button>

        <button mat-fab
                [class.camera-off]="callState.isCameraOff"
                (click)="webRTCService.toggleCamera()">
          <mat-icon>{{callState.isCameraOff ? 'videocam_off' : 'videocam'}}</mat-icon>
        </button>

        <button mat-fab
                [class.audio-only]="callState.isAudioOnly"
                (click)="webRTCService.toggleAudioOnly()">
          <mat-icon>{{callState.isAudioOnly ? 'mic' : 'connected_video'}}</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .call-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: #1D192B;
      z-index: 1000;
      display: flex;
      flex-direction: column;
    }

    .video-container {
      position: relative;
      flex: 1;
      background-color: #000;
      overflow: hidden;
    }

    .remote-video-container {
      position: relative;
      flex: 1;
      background-color: #000;
      overflow: hidden;
    }

    .remote-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: opacity 0.3s ease;
    }

    .local-video {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 240px;
      height: 135px;
      border-radius: 12px;
      border: 2px solid rgba(255,255,255,0.2);
      object-fit: cover;
      transition: all 0.3s ease;
      z-index: 10;
    }

    .local-video.hidden {
      opacity: 0;
      transform: scale(0.8);
    }

    .audio-only-placeholder {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: white;
      z-index: 5;
    }

    .audio-only-placeholder mat-icon {
      font-size: 120px;
      height: 120px;
      width: 120px;
      opacity: 0.8;
    }

    .audio-only-placeholder h3 {
      margin: 20px 0;
      font-size: 24px;
    }

    .audio-wave {
      display: flex;
      gap: 4px;
      justify-content: center;
      align-items: center;
      height: 40px;
    }

    .wave-bar {
      width: 4px;
      background-color: rgba(255,255,255,0.6);
      border-radius: 2px;
      animation: wave 1s ease-in-out infinite;
    }

    .wave-bar:nth-child(1) { animation-delay: 0.0s; height: 60%; }
    .wave-bar:nth-child(2) { animation-delay: 0.1s; height: 80%; }
    .wave-bar:nth-child(3) { animation-delay: 0.2s; height: 100%; }
    .wave-bar:nth-child(4) { animation-delay: 0.3s; height: 80%; }
    .wave-bar:nth-child(5) { animation-delay: 0.4s; height: 60%; }

    @keyframes wave {
      0%, 100% { transform: scaleY(1); }
      50% { transform: scaleY(0.5); }
    }

    .vitals-overlay {
      position: absolute;
      top: 20px;
      left: 20px;
      display: flex;
      gap: 16px;
      padding: 12px;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(8px);
      border-radius: 12px;
    }

    .vital-sign {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: white;
    }

    .vital-sign .label {
      font-size: 12px;
      opacity: 0.8;
    }

    .vital-sign .value {
      font-size: 18px;
      font-weight: 500;
      margin-top: 4px;
    }

    .call-duration {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(8px);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
    }

    .call-controls {
      position: absolute;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 24px;
      padding: 16px;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(8px);
      border-radius: 32px;
    }

    .mat-fab {
      background-color: rgba(255,255,255,0.2);
      transition: all 0.3s ease;
    }

    .mat-fab:hover {
      transform: scale(1.1);
    }

    .mat-fab.muted {
      background-color: #f44336;
    }

    .mat-fab.camera-off {
      background-color: #f44336;
    }

    .mat-fab.audio-only {
      background-color: #2196f3;
    }

    .end-call-button {
      transform: scale(1.2);
    }

    .end-call-button:hover {
      transform: scale(1.3);
      background-color: #d32f2f !important;
    }

    .hidden {
      display: none;
    }

    .speaking-indicator {
      position: absolute;
      top: 10px;
      right: 10px;
      background-color: rgba(0, 0, 0, 0.5);
      padding: 5px;
      border-radius: 50%;
      color: white;
    }

    .speaking-indicator mat-icon {
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
  `]
})
export class CallInterfaceComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;
  private callStateSubscription?: Subscription;

  constructor(public webRTCService: WebRTCService) {}

  ngOnInit(): void {
    console.log('CallInterfaceComponent initialized');
    this.callStateSubscription = this.webRTCService.callState$.subscribe(state => {
      console.log('Call state updated:', state);
      
      if (this.localVideo?.nativeElement && state.localStream) {
        console.log('Setting local video stream');
        this.localVideo.nativeElement.srcObject = state.localStream;
      }
      
      if (this.remoteVideo?.nativeElement && state.remoteStream) {
        console.log('Setting remote video stream');
        this.remoteVideo.nativeElement.srcObject = state.remoteStream;
      }
    });
  }

  ngOnDestroy(): void {
    console.log('CallInterfaceComponent destroyed');
    this.callStateSubscription?.unsubscribe();
    
    // Nettoyer les flux vidéo
    if (this.localVideo?.nativeElement) {
      this.localVideo.nativeElement.srcObject = null;
    }
    if (this.remoteVideo?.nativeElement) {
      this.remoteVideo.nativeElement.srcObject = null;
    }
  }

  formatDuration(startTime: Date | null): string {
    if (!startTime) return '00:00';
    const diff = new Date().getTime() - startTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatBadgeModule } from '@angular/material/badge';
import { WebRTCService } from '../../services/webrtc/webrtc.service';
import { FlexModule } from '@ngbracket/ngx-layout';
import { Subscription, Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthService } from '../../services/auth/auth.service';
import { SensorMockService, VitalSigns } from '../../services/sensor/sensor-mock.service';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

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
    <div class="call-container" [class.doctor-view]="isDoctorView">
      <div class="video-container" *ngIf="showVideo">
        <video #remoteVideo autoplay playsinline
               [class.speaking]="(callState$ | async)?.isRemoteSpeaking">
        </video>
        <div class="audio-indicator"
             [class.speaking]="(callState$ | async)?.isRemoteSpeaking">
          <mat-icon>{{(callState$ | async)?.isRemoteSpeaking ? 'volume_up' : 'volume_off'}}</mat-icon>
          <span>{{(callState$ | async)?.isRemoteSpeaking ? 'En train de parler' : 'Silencieux'}}</span>
        </div>
      </div>

      <div class="controls-container">
        <div class="call-info">
          <h2>En appel avec {{(remoteUserInfo$ | async)?.name}}</h2>
          <span class="duration">{{callDuration$ | async}}</span>

        <!-- Audio Only Placeholder -->
        <div class="audio-only-placeholder"
             *ngIf="(callState$ | async)?.isAudioOnly || !(callState$ | async)?.remoteStream">
          <mat-icon>account_circle</mat-icon>
          <h3>{{(callState$ | async)?.remotePeerName || 'En attente de connexion...'}}</h3>
          <div class="audio-wave" *ngIf="(callState$ | async)?.remoteStream">
            <div class="wave-bar" *ngFor="let i of [1,2,3,4,5]"></div>
          </div>
        </div>
        <div class="vitals-overlay" *ngIf="!isSensorConnected">
          <div class="warning-banner sensor-warning" >
            <mat-icon class="warning-icon">sensors_off</mat-icon>
            <span class="warning-text">
              Capteurs déconnectés
            </span>
          </div>
        </div>
        
        <!-- Vitals Overlay -->
        <div class="vitals-overlay">
          <div class="warning-banner sensor-warning" *ngIf="!isSensorConnected">
            <mat-icon class="warning-icon">sensors_off</mat-icon>
            <span class="warning-text">Capteurs déconnectés</span>
          </div>

          <div class="warning-banner connection-warning" *ngIf="!isConnectionStable && isSensorConnected">
            <mat-icon class="warning-icon">signal_wifi_statusbar_connected_no_internet_4</mat-icon>
            <span class="warning-text">Connexion instable</span>
          </div>

          @if(currentVitals) {
            <div class="vitals-row">
              <div class="vital-sign" [class.warning]="!isNormalScenario">
                <span class="label">SpO2</span>
                <span class="value">{{currentVitals.spo2 | number:'1.0-0'}}%</span>
              </div>
              <div class="vital-sign" [class.warning]="!isNormalScenario">
                <span class="label">BPM</span>
                <span class="value">{{currentVitals.ecg | number:'1.0-0'}}</span>
              </div>
              <div class="vital-sign" [class.warning]="!isNormalScenario">
                <span class="label">BP</span>
                <span class="value">{{currentVitals.nibp.systolic | number:'1.0-0'}}/{{currentVitals.nibp.diastolic | number:'1.0-0'}}</span>
              </div>
              <div class="vital-sign" [class.warning]="!isNormalScenario">
                <span class="label">Temp</span>
                <span class="value">{{currentVitals.temperature | number:'1.1-1'}}°C</span>
              </div>
            </div>
            <div class="warning-message" *ngIf="!isNormalScenario">
              ⚠️ Attention : Signes vitaux anormaux, un risque de {{getScenarioLabel(currentVitals.scenario)}} détecté !
            </div>
          }
        </div>

        <div class="call-controls">
          <button mat-fab color="primary" (click)="toggleMute()"
                  [class.muted]="(callState$ | async)?.isMuted">
            <mat-icon>{{(callState$ | async)?.isMuted ? 'mic_off' : 'mic'}}</mat-icon>
          </button>

          <button mat-fab color="warn" (click)="endCall()">
            <mat-icon>call_end</mat-icon>
          </button>
        </div>
      </div>

      <div class="speaking-indicator" *ngIf="callState$ | async as state">
        <ng-container *ngIf="state.isLocalSpeaking || state.isRemoteSpeaking">
          <mat-icon>volume_up</mat-icon>
          <span>{{ state.isLocalSpeaking ? 'Vous parlez' :
                 (state.speakingUserName + ' parle') }}</span>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .call-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #1a1a1a;
      color: white;
    }

    .video-container {
      flex: 1;
      position: relative;
      background: #000;
      overflow: hidden;
    }

    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: box-shadow 0.3s ease;
    }

    video.speaking {
      box-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
    }

    .audio-indicator {
      position: absolute;
      top: 1rem;
      right: 1rem;
      display: flex;
      align-items: center;
      padding: 0.5rem 1rem;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 2rem;
      transition: all 0.3s ease;
    }

    .audio-indicator.speaking {
      background: rgba(76, 175, 80, 0.7);
    }

    .audio-indicator mat-icon {
      margin-right: 0.5rem;
    }

    .controls-container {
      padding: 1rem;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .call-info {
      text-align: center;
    }

    .call-info h2 {
      margin: 0;
      font-size: 1.2rem;
    }

    .duration {
      font-size: 0.9rem;
      opacity: 0.8;
    }

    .call-controls {
      display: flex;
      gap: 1rem;
    }

    button.muted {
      background-color: #f44336;
    }

    .speaking-indicator {
      position: fixed;
      top: 1rem;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      padding: 0.5rem 1rem;
      border-radius: 2rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      z-index: 1000;
      transition: opacity 0.3s ease;
    }

    .speaking-indicator mat-icon {
      color: #4CAF50;
    }

    .vital-sign.warning {
      animation: pulse 2s infinite;
    }

    .warning-message {
      width: 100%;
      text-align: center;
      color: white;
      font-weight: bold;
      background: rgba(0,0,0,0.6);
      padding: 5px;
      border-radius: 12px;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    .sensor-warning {
      display: flex;
      align-items: center;
      gap: 14px;
      border-left: 4px solid #ff9800;
      color: white;
      padding: 10px;
    }

    .sensor-warning .warning-icon {
      color: white;
    }


    .vitals-overlay {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      position: absolute;
      top: 170px;
      left: 50%;
      transform: translateX(-50%) scale(1.5);
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

    .vitals-row {
      display: flex;
      flex-direction: row;
      gap: 10px;
    }

    .warning-text {
      color: white;
    }
  `]
})
export class CallInterfaceComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;
  
  // Déplacer ces déclarations dans le constructeur
  callState$: Observable<any>;
  remoteUserInfo$: Observable<any>;
  callDuration$: Observable<string>;
  
  isDoctorView = false;
  showVideo = true;

  private callStateSubscription?: Subscription;
  private socket$: WebSocketSubject<any>;

  // Vitals
  currentVitals: VitalSigns | null = null;
  isNormalScenario: boolean = false;
  isSensorConnected: boolean = false;
  isConnectionStable: boolean = true;
  lastVitalsUpdate: number = Date.now();
  vitalsCheckInterval?: any;

  constructor(
    private webRTCService: WebRTCService,
    private authService: AuthService
  ) {
    // Initialiser les observables dans le constructeur
    this.callState$ = this.webRTCService.callState$;
    this.remoteUserInfo$ = this.webRTCService.getRemoteUserInfo$();
    this.callDuration$ = this.webRTCService.getCallDuration$();

    this.socket$ = webSocket('wss://websocket.chhilif.com/ws');
    this.socket$.subscribe({
      next: (data) => {
        const vitals = data as VitalSigns;
        this.currentVitals = vitals;
        this.isNormalScenario = vitals?.scenario === 'normal';
        this.isSensorConnected = true;
        this.isConnectionStable = true;
        this.lastVitalsUpdate = Date.now();
      }
    });

    this.vitalsCheckInterval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - this.lastVitalsUpdate;
      this.isSensorConnected = timeSinceLastUpdate < 5000;
      this.isConnectionStable = timeSinceLastUpdate < 1500;
    }, 300);
  }

  ngOnInit(): void {
    console.log('CallInterfaceComponent initialized');

    // Déterminer le rôle de l'utilisateur
    this.authService.user$.pipe(take(1)).subscribe(user => {
      this.isDoctorView = user?.role === 'medecin';
      this.showVideo = this.isDoctorView;
    });

    // S'abonner aux changements d'état
    this.callStateSubscription = this.callState$.subscribe(state => {
      console.log('Call state updated:', state);

      if (this.remoteVideo?.nativeElement && state.remoteStream) {
        console.log('Setting remote video stream');
        this.remoteVideo.nativeElement.srcObject = state.remoteStream;
      }

    });
  }

  ngOnDestroy(): void {
    console.log('CallInterfaceComponent destroyed');
    this.callStateSubscription?.unsubscribe();

    if (this.remoteVideo?.nativeElement) {
      this.remoteVideo.nativeElement.srcObject = null;
    }
  }

  toggleMute(): void {
    this.webRTCService.toggleMute();
  }

  endCall(): void {
    this.webRTCService.endCall();
  }

  formatDuration(startTime: Date | null): string {
    if (!startTime) return '00:00';
    const diff = new Date().getTime() - startTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getScenarioLabel(scenario: string): string {
    const scenarios: { [key: string]: string } = {
      'normal': 'normal',
      'hyperthermia': 'hyperthermie',
      'hypothermia': 'hypothermie',
      'hemorrhagic': 'hemorragie',
      'cardiac_arrest': 'arret cardiaque',
      'asthma': 'crise d\'asthme'
    };
    return scenarios[scenario] || scenario;
  }
}

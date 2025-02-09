import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { WebRTCService } from '../../services/webrtc/webrtc.service';
import { Observable } from 'rxjs';
import { RemoteUserInfo } from '../../services/webrtc/webrtc.service';
import { VitalSigns } from '../../services/sensor/sensor-mock.service';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

@Component({
  selector: 'app-call-interface-nurse',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="nurse-call-container">
      <div class="call-header">
        <h2>En appel avec {{ (remoteUserInfo$ | async)?.name || 'Médecin' }}</h2>
        <span class="call-duration" *ngIf="callDuration$ | async as duration">
          {{ duration }}
        </span>
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
        <button mat-fab color="primary" (click)="toggleMute()">
          <mat-icon>{{ (callState$ | async)?.isMuted ? 'mic_off' : 'mic' }}</mat-icon>
        </button>
        <button mat-fab color="warn" (click)="endCall()">
          <mat-icon>call_end</mat-icon>
        </button>
      </div>

      <div class="transcription-container">
        <div class="transcription-header">
          <h3>Transcription</h3>
          <button mat-icon-button (click)="toggleSpeechRecognition()"
                  [color]="isListening ? 'accent' : 'primary'">
            <mat-icon>{{isListening ? 'mic' : 'mic_off'}}</mat-icon>
          </button>
        </div>
        <div class="transcription-content" *ngIf="transcription">
          {{ transcription }}
        </div>
        <div class="transcription-placeholder" *ngIf="!transcription">
          Cliquez sur le microphone pour commencer la transcription...
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nurse-call-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 2rem;
      background: #f5f5f5;
    }

    .call-header {
      text-align: center;
    }

    .call-duration {
      display: block;
      font-size: 1.2rem;
      color: #666;
      margin-top: 0.5rem;
    }

    .call-controls {
      display: flex;
      gap: 1rem;
      padding: 2rem 2rem 6rem;
    }

    .vital-sign.warning {
      animation: pulse 2s infinite;
    }

    .warning-message {
      width: 100%;
      text-align: center;
      color: white;
      font-weight: bold;
      background: rgba(0, 0, 0, 0.6);
      padding: 5px;
      border-radius: 12px;
    }

    @keyframes pulse {
      0% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
      100% {
        opacity: 1;
      }
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
      background: rgba(0, 0, 0, 0.6);
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

    .warning-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      backdrop-filter: blur(8px);
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .transcription-container {
      position: absolute;
      bottom: 145px;
      left: 20px;
      width: 300px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(8px);
    }

    .transcription-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .transcription-header h3 {
      margin: 0;
      color: #333;
    }

    .transcription-content {
      max-height: 200px;
      overflow-y: auto;
      padding: 8px;
      background: rgba(0, 0, 0, 0.05);
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.4;
    }

    .transcription-placeholder {
      color: #666;
      font-style: italic;
      text-align: center;
      padding: 16px;
    }
  `]
})
export class CallInterfaceNurseComponent implements OnInit, OnDestroy {
  callState$: Observable<any>;
  remoteUserInfo$: Observable<RemoteUserInfo | null>;
  callDuration$: Observable<string>;

  private socket$: WebSocketSubject<any>;

  // Vitals
  currentVitals: VitalSigns | null = null;
  isNormalScenario: boolean = false;
  isSensorConnected: boolean = false;
  isConnectionStable: boolean = true;
  lastVitalsUpdate: number = Date.now();
  vitalsCheckInterval?: any;

  private recognition: any;
  transcription: string = '';
  isListening: boolean = false;
  private transcriptionHistory: string[] = [];
  private lastSentTranscription: string = '';

  constructor(private webRTCService: WebRTCService) {
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

    // Initialisation de la reconnaissance vocale
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'fr-FR';

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            this.transcriptionHistory.push(transcript.trim());
            // Envoyer la transcription via WebRTC
            this.webRTCService.sendTranscription(transcript.trim());
          } else {
            interimTranscript += transcript;
          }
        }

        this.transcription = finalTranscript + interimTranscript;
      };

      this.recognition.onerror = (event: any) => {
        console.error('Erreur de reconnaissance vocale:', event.error);
        this.isListening = false;
      };
    }
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

  ngOnInit() {}

  toggleMute() {
    this.webRTCService.toggleMute();
  }

  endCall() {
    this.webRTCService.endCall();
  }

  toggleSpeechRecognition(): void {
    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    } else {
      this.recognition.start();
      this.isListening = true;
    }
  }

  ngOnDestroy() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }
}

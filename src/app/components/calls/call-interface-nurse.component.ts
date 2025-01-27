import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { WebRTCService } from '../../services/webrtc/webrtc.service';
import { Observable } from 'rxjs';
import { RemoteUserInfo } from '../../services/webrtc/webrtc.service';

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

      <div class="call-controls">
        <button mat-fab color="primary" (click)="toggleMute()">
          <mat-icon>{{ (callState$ | async)?.isMuted ? 'mic_off' : 'mic' }}</mat-icon>
        </button>
        <button mat-fab color="warn" (click)="endCall()">
          <mat-icon>call_end</mat-icon>
        </button>
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
      padding: 2rem;
    }
  `]
})
export class CallInterfaceNurseComponent implements OnInit {
  callState$: Observable<any>;
  remoteUserInfo$: Observable<RemoteUserInfo | null>;
  callDuration$: Observable<string>;

  constructor(private webRTCService: WebRTCService) {
    this.callState$ = this.webRTCService.callState$;
    this.remoteUserInfo$ = this.webRTCService.getRemoteUserInfo$();
    this.callDuration$ = this.webRTCService.getCallDuration$();
  }

  ngOnInit() {}

  toggleMute() {
    this.webRTCService.toggleMute();
  }

  endCall() {
    this.webRTCService.endCall();
  }
} 
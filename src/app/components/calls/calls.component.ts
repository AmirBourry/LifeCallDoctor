import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CallListComponent } from './call-list.component';
import { CallInterfaceComponent } from './call-interface.component';
import { WebRTCService } from '../../services/webrtc/webrtc.service';
import { Observable } from 'rxjs';
import { CallState } from '../../services/webrtc/webrtc.service';
import { AuthService } from '../../services/auth/auth.service';
import { CallInterfaceNurseComponent } from './call-interface-nurse.component';

@Component({
  selector: 'app-calls',
  standalone: true,
  imports: [
    CommonModule,
    CallListComponent,
    CallInterfaceComponent,
    CallInterfaceNurseComponent
  ],
  template: `
    <div class="calls-container">
      <ng-container *ngIf="callState$ | async as callState">
        <app-call-list *ngIf="!callState.isInCall"></app-call-list>
        <ng-container *ngIf="callState.isInCall">
          <app-call-interface *ngIf="isDoctor$ | async"></app-call-interface>
          <app-call-interface-nurse *ngIf="isNurse$ | async"></app-call-interface-nurse>
        </ng-container>
      </ng-container>
    </div>
  `,
  styles: [`
    .calls-container {
      height: 100%;
      width: 100%;
      position: relative;
      padding: 20px;
      box-sizing: border-box;
      overflow-y: auto;
    }

    :host {
      display: block;
      height: 100%;
      width: 100%;
    }
  `]
})
export class CallsComponent {
  callState$: Observable<CallState>;
  isDoctor$: Observable<boolean>;
  isNurse$: Observable<boolean>;

  constructor(
    private webRTCService: WebRTCService,
    private authService: AuthService
  ) {
    this.callState$ = this.webRTCService.callState$;
    this.isDoctor$ = this.authService.isMedecin();
    this.isNurse$ = this.authService.isInfirmier();
  }
}

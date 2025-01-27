import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {CallsListComponent} from './call-list.component';
import {CallInterfaceComponent} from './call-interface.component';
import {WebRTCService} from '../../services/webrtc/webrtc.service';

@Component({
  selector: 'app-calls',
  standalone: true,
  imports: [
    CommonModule,
    CallsListComponent,
    CallInterfaceComponent
  ],
  template: `
    <ng-container *ngIf="webRTCService.callState$ | async as callState">
      <!-- Liste des utilisateurs quand pas en appel -->
      <app-calls-list *ngIf="!callState.isInCall"></app-calls-list>

      <!-- Interface d'appel quand en appel -->
      <app-call-interface *ngIf="callState.isInCall"></app-call-interface>
    </ng-container>
  `
})
export class CallsComponent {
  constructor(public webRTCService: WebRTCService) {}
}

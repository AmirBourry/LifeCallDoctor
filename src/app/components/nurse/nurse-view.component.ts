import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { WebRTCService, OnlineUser } from '../../services/webrtc/webrtc.service';
import { CallInterfaceNurseComponent } from '../calls/call-interface-nurse.component';
import { AuthService } from '../../services/auth/auth.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-nurse-view',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    CallInterfaceNurseComponent
  ],
  template: `
    <div class="nurse-container">
      <mat-toolbar color="primary" class="header-toolbar">
        <span>LifeCall - Interface Infirmier</span>
        <span class="toolbar-spacer"></span>
        <button mat-icon-button (click)="logout()" class="logout-button">
          <mat-icon>exit_to_app</mat-icon>
        </button>
      </mat-toolbar>

      <ng-container *ngIf="!(callState$ | async)?.isInCall; else callView">
        <div class="content">
          <div class="header">
            <h1>Liste des médecins disponibles</h1>
          </div>

          <div class="doctors-grid">
            <mat-card *ngFor="let doctor of availableDoctors$ | async" class="doctor-card">
              <mat-card-header>
                <div class="status-indicator" [class.online]="doctor.status === 'online'"
                     [class.in-call]="doctor.status === 'in-call'">
                </div>
                <mat-icon mat-card-avatar>person</mat-icon>
                <mat-card-title>Dr. {{ doctor.nom }} {{ doctor.prenom }}</mat-card-title>
                <mat-card-subtitle>{{ doctor.specialite || 'Médecin généraliste' }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="status-text">
                  <span [ngClass]="doctor.status">
                    {{ doctor.status === 'online' ? 'Disponible' : 
                       doctor.status === 'in-call' ? 'En consultation' : 'Hors ligne' }}
                  </span>
                </div>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button color="primary" 
                        [disabled]="doctor.status === 'in-call'"
                        (click)="startCall(doctor.id)">
                  <mat-icon>video_call</mat-icon>
                  {{ doctor.status === 'in-call' ? 'En consultation' : 'Appeler' }}
                </button>
              </mat-card-actions>
            </mat-card>
          </div>
        </div>
      </ng-container>

      <ng-template #callView>
        <app-call-interface-nurse></app-call-interface-nurse>
      </ng-template>
    </div>
  `,
  styles: [`
    .nurse-container {
      height: 100vh;
      width: 100%;
      display: flex;
      flex-direction: column;
      background: #f5f5f5;
      overflow: hidden;
    }

    .header-toolbar {
      position: relative;
      z-index: 2;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      flex-shrink: 0;
    }

    .toolbar-spacer {
      flex: 1 1 auto;
    }

    .logout-button {
      margin-left: 1rem;
    }

    .content {
      flex: 1;
      padding: 2rem;
      overflow-y: auto;
      width: 100%;
    }

    .header {
      margin-bottom: 2rem;
      text-align: center;
    }

    .header h1 {
      color: #333;
      font-size: 2rem;
      margin: 0;
    }

    .doctors-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
      padding: 1rem;
    }

    .doctor-card {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      cursor: pointer;
    }

    .doctor-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    mat-card-actions {
      padding: 1rem;
      display: flex;
      justify-content: center;
    }

    button mat-icon {
      margin-right: 8px;
    }

    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: #757575;
      margin-right: 8px;
      transition: background-color 0.3s ease;
    }

    .status-indicator.online {
      background-color: #4CAF50;
    }

    .status-indicator.in-call {
      background-color: #FF9800;
    }

    .status-text {
      margin: 8px 0;
      font-size: 0.9rem;
    }

    .status-text .online {
      color: #4CAF50;
    }

    .status-text .in-call {
      color: #FF9800;
    }

    .status-text .offline {
      color: #757575;
    }

    mat-card-header {
      display: flex;
      align-items: center;
    }

    mat-card-subtitle {
      margin-top: 4px;
      color: rgba(0, 0, 0, 0.6);
    }

    button[disabled] {
      background-color: rgba(0, 0, 0, 0.12);
    }
  `]
})
export class NurseViewComponent implements OnInit {
  availableDoctors$: Observable<OnlineUser[]>;
  callState$: Observable<any>;

  constructor(
    private webRTCService: WebRTCService,
    private authService: AuthService
  ) {
    this.availableDoctors$ = this.webRTCService.getOnlineUsers().pipe(
      map(users => users.filter(user => user.status !== 'offline'))
    );
    this.callState$ = this.webRTCService.callState$;
  }

  ngOnInit() {}

  async startCall(doctorId: string) {
    try {
      await this.webRTCService.startCall(doctorId);
    } catch (error) {
      console.error('Erreur lors de l\'initiation de l\'appel:', error);
    }
  }

  async logout() {
    try {
      await this.authService.signOut();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  }
} 
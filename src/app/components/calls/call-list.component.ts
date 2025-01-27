import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatRippleModule } from '@angular/material/core';
import { WebRTCService, OnlineUser } from '../../services/webrtc/webrtc.service';
import { Observable, Subscription, BehaviorSubject, combineLatest } from 'rxjs';
import { FlexModule } from '@ngbracket/ngx-layout';
import { AuthService } from '../../services/auth/auth.service';
import { take } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MediaPermissionDialogComponent } from './media-permission-dialog.component';
import { CallingDialogComponent } from './calling-dialog.component';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-call-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatDividerModule,
    MatRippleModule,
    FlexModule
  ],
  template: `
    <div class="call-list-container">
      <div class="header">
        <h1>Liste des infirmiers disponibles</h1>
      </div>

      <div class="users-container">
        <ng-container *ngIf="(availableUsers$ | async)?.length; else noUsers">
          <div class="user-list">
            <div *ngFor="let user of availableUsers$ | async"
                 class="user-card"
                 [class.in-call]="user.status === 'in-call'">
              <div class="user-info">
                <div class="status-indicator" [class.online]="user.status === 'online'"
                     [class.in-call]="user.status === 'in-call'">
                </div>
                <mat-icon class="user-icon">person</mat-icon>
                <div class="user-details">
                  <h3>{{ user.nom }} {{ user.prenom }}</h3>
                  <p class="status-text">
                    <span [ngClass]="user.status">
                      {{ user.status === 'online' ? 'Disponible' : 
                         user.status === 'in-call' ? 'En consultation' : 'Hors ligne' }}
                    </span>
                  </p>
                </div>
              </div>
              <button mat-raised-button 
                      color="primary"
                      [disabled]="user.status === 'in-call'"
                      (click)="startCall(user.id)">
                <mat-icon>video_call</mat-icon>
                {{ user.status === 'in-call' ? 'En consultation' : 'Appeler' }}
              </button>
            </div>
          </div>
        </ng-container>

        <ng-template #noUsers>
          <div class="no-users">
            <mat-icon>people_outline</mat-icon>
            <p>Aucun infirmier disponible pour le moment</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .call-list-container {
      height: 100%;
      width: 100%;
      padding: 2rem;
      box-sizing: border-box;
      overflow-y: auto;
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

    .users-container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0;
    }

    .user-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
      width: 100%;
    }

    .user-card {
      background: white;
      border-radius: 8px;
      padding: 1rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .user-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: #757575;
      transition: background-color 0.3s ease;
    }

    .status-indicator.online {
      background-color: #4CAF50;
    }

    .status-indicator.in-call {
      background-color: #FF9800;
    }

    .user-icon {
      color: #666;
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
    }

    .user-details {
      flex: 1;
    }

    .user-details h3 {
      margin: 0;
      color: #333;
      font-size: 1.1rem;
    }

    .status-text {
      margin: 0.25rem 0 0;
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

    button {
      width: 100%;
    }

    button mat-icon {
      margin-right: 0.5rem;
    }

    .no-users {
      text-align: center;
      padding: 3rem;
      color: #666;
    }

    .no-users mat-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      margin-bottom: 1rem;
    }
  `]
})
export class CallListComponent implements OnInit, OnDestroy {
  availableUsers$: Observable<OnlineUser[]>;
  private subscriptions: Subscription[] = [];

  constructor(
    private webRTCService: WebRTCService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.availableUsers$ = this.webRTCService.getOnlineUsers().pipe(
      map(users => users.filter(user => user.status !== 'offline'))
    );
  }

  ngOnInit() {
    // Surveiller l'état des appels
    this.subscriptions.push(this.webRTCService.callState$.subscribe(state => {
      if (state.isInCall) {
        // Mettre à jour l'interface si nécessaire
      }
    }));
  }

  async startCall(userId: string) {
    try {
      // Vérifier les permissions avant de démarrer l'appel
      const permissions = await this.webRTCService.checkAndRequestPermissions();
      
      if (!permissions.video && !permissions.audio) {
        // Afficher le dialogue de permission si nécessaire
        const dialogRef = this.dialog.open(MediaPermissionDialogComponent, {
          width: '400px',
          disableClose: true
        });

        const result = await dialogRef.afterClosed().toPromise();
        if (!result) return;
      }

      // Démarrer l'appel
      await this.webRTCService.startCall(userId);
      
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'appel:', error);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}

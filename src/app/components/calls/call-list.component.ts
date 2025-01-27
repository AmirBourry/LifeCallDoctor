import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatRippleModule } from '@angular/material/core';
import { WebRTCService, OnlineUser } from '../../services/webrtc/webrtc.service';
import { Observable, Subscription } from 'rxjs';
import { FlexModule } from '@ngbracket/ngx-layout';
import { AuthService } from '../../services/auth/auth.service';
import { take } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MediaPermissionDialogComponent } from './media-permission-dialog.component';

@Component({
  selector: 'app-calls-list',
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
    <div class="calls-container">
      <div class="online-users-section">
        <h2>Personnel disponible</h2>

        <div class="search-bar">
          <mat-icon>search</mat-icon>
          <input type="text" placeholder="Rechercher un membre du personnel...">
        </div>

        <div class="users-list" *ngIf="onlineUsers$ | async as users">
          <div class="empty-state" *ngIf="users.length === 0">
            <mat-icon>people_outline</mat-icon>
            <p>Aucun personnel disponible pour le moment</p>
          </div>

          <div class="users-grid" *ngIf="users.length > 0">
            <mat-card class="user-card" *ngFor="let user of users"
                      [class.online]="user.status === 'online'"
                      matRipple
                      (click)="initiateCall(user)">
              <div class="user-info">
                <div class="user-avatar">
                  <div class="status-indicator" [class]="user.status"></div>
                  <mat-icon>{{user.role === 'medecin' ? 'medical_services' : 'health_and_safety'}}</mat-icon>
                </div>
                <div class="user-details">
                  <h3>{{user.name}}</h3>
                  <p>{{user.role === 'medecin' ? 'Médecin' : 'Infirmier'}}</p>
                </div>
              </div>
              <button mat-icon-button color="primary" class="call-button">
                <mat-icon>videocam</mat-icon>
              </button>
            </mat-card>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .calls-container {
      padding: 24px;
      height: calc(100vh - 48px);
      background-color: #F7F2FA;
      overflow-y: auto;
    }

    h2 {
      color: #1D192B;
      font-size: 24px;
      margin-bottom: 24px;
      font-weight: 500;
    }

    .search-bar {
      display: flex;
      align-items: center;
      background: white;
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 24px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .search-bar mat-icon {
      color: #49454F;
      margin-right: 12px;
    }

    .search-bar input {
      border: none;
      outline: none;
      width: 100%;
      font-size: 16px;
      color: #1D192B;
    }

    .search-bar input::placeholder {
      color: #79747E;
    }

    .users-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }

    .user-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-radius: 16px;
      background: white;
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }

    .user-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .user-avatar {
      position: relative;
      width: 48px;
      height: 48px;
      background: #E8DEF8;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-avatar mat-icon {
      color: #6750A4;
      font-size: 24px;
    }

    .status-indicator {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
    }

    .status-indicator.online {
      background-color: #4CAF50;
    }

    .status-indicator.in-call {
      background-color: #FFC107;
    }

    .status-indicator.offline {
      background-color: #9E9E9E;
    }

    .user-details h3 {
      margin: 0;
      color: #1D192B;
      font-size: 16px;
      font-weight: 500;
    }

    .user-details p {
      margin: 4px 0 0;
      color: #49454F;
      font-size: 14px;
    }

    .call-button {
      background-color: #E8DEF8;
    }

    .empty-state {
      text-align: center;
      padding: 48px;
      background: white;
      border-radius: 16px;
      color: #49454F;
      grid-column: 1 / -1;
    }

    .empty-state mat-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      margin-bottom: 16px;
      color: #79747E;
    }

    .empty-state p {
      margin: 0;
      font-size: 16px;
    }
  `]
})
export class CallsListComponent implements OnInit, OnDestroy {
  onlineUsers$: Observable<OnlineUser[]>;
  private callStateSubscription?: Subscription;

  constructor(
    private webRTCService: WebRTCService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.onlineUsers$ = this.webRTCService.getOnlineUsers();
  }

  ngOnInit() {
    // Surveiller l'état des appels
    this.callStateSubscription = this.webRTCService.callState$.subscribe(state => {
      if (state.isInCall) {
        // Mettre à jour l'interface si nécessaire
      }
    });
  }

  async initiateCall(user: OnlineUser): Promise<void> {
    try {
      const currentUser = await this.authService.user$.pipe(take(1)).toPromise();
      if (!currentUser) return;

      if (user.status === 'in-call') {
        // Créer l'ID de session en utilisant l'ID de l'autre utilisateur comme initiateur
        const sessionId = `${user.id}_${currentUser.uid}`;
        await this.webRTCService.acceptCall(sessionId, user.id);
      } else {
        await this.webRTCService.startCall(user.id);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'PERMISSION_DENIED') {
        const dialogRef = this.dialog.open(MediaPermissionDialogComponent, {
          width: '400px',
          disableClose: true,
          data: { isRetry: false }
        });
        
        dialogRef.afterClosed().subscribe(async result => {
          if (result) {
            try {
              await new Promise(resolve => setTimeout(resolve, 1000));
              await this.initiateCall(user);
            } catch (retryError) {
              console.error('Erreur lors de la nouvelle tentative:', retryError);
            }
          }
        });
      } else {
        console.error('Erreur lors de l\'initiation de l\'appel:', error);
      }
    }
  }

  ngOnDestroy() {
    this.callStateSubscription?.unsubscribe();
  }
}

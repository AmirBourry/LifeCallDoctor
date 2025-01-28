import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatDivider } from '@angular/material/divider';
import { FlexModule } from '@ngbracket/ngx-layout';
import { CommonModule } from '@angular/common';
import { AuthService, AppUser } from '../../services/auth/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatDivider,
    FlexModule,
    MatButtonModule,
    MatIconModule,
    MatRippleModule
  ],
  template: `
    <div class="sidebar">
      <div class="logo-section">
        <h1 class="app-title">LifeCall</h1>
        <p class="app-subtitle">Plateforme de gestion d'interventions d'urgence</p>
      </div>

      <nav class="nav-menu">
        <a *ngFor="let item of menuItems"
           [routerLink]="item.route"
           routerLinkActive="active"
           class="nav-item"
           matRipple>
          <mat-icon class="nav-icon">{{item.icon}}</mat-icon>
          <span class="nav-label">{{item.label}}</span>
          <div class="active-indicator"></div>
        </a>
      </nav>

      <div class="user-section" *ngIf="user$ | async as user">
        <div class="user-info">
          <div class="user-avatar">
            <mat-icon>person</mat-icon>
          </div>
          <div class="user-details">
            <span class="user-name">{{ user.nom }} {{ user.prenom }}</span>
            <span class="user-role">{{ user.role }}</span>
          </div>
        </div>
        <button class="logout-button" (click)="logout()" matRipple>
          <mat-icon>logout</mat-icon>
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .sidebar {
      width: 280px;
      min-width: 280px;
      height: 100vh;
      position: fixed;
      left: 0;
      top: 0;
      background-color: #fff;
      box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%);
      color: white;
      display: flex;
      flex-direction: column;
      padding: 1.5rem;
      box-sizing: border-box;
    }

    .logo-section {
      text-align: center;
      padding: 1rem 0 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .app-title {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 300;
      letter-spacing: 0.5px;
    }

    .app-subtitle {
      margin: 0.5rem 0 0;
      font-size: 0.9rem;
      opacity: 0.7;
    }

    .nav-menu {
      margin-top: 2rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex: 1;
    }

    .nav-item {
      display: flex;
      align-items: center;
      padding: 1rem;
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .nav-item.active {
      background: rgba(255, 255, 255, 0.15);
      color: white;
    }

    .nav-icon {
      margin-right: 1rem;
    }

    .nav-label {
      font-size: 1rem;
      font-weight: 400;
    }

    .active-indicator {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: #3498db;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .nav-item.active .active-indicator {
      opacity: 1;
    }

    .user-section {
      margin-top: auto;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .user-info {
      display: flex;
      align-items: center;
      padding: 0.5rem;
      margin-bottom: 1rem;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 1rem;
    }

    .user-details {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-size: 0.9rem;
      font-weight: 500;
    }

    .user-role {
      font-size: 0.8rem;
      opacity: 0.7;
    }

    .logout-button {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.8rem;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      gap: 0.5rem;
    }

    .logout-button:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    @media (max-width: 768px) {
      .sidebar {
        width: 80px;
        padding: 1rem 0.5rem;
      }

      .app-subtitle,
      .nav-label,
      .user-details {
        display: none;
      }

      .app-title {
        font-size: 1.2rem;
      }

      .nav-item {
        justify-content: center;
        padding: 1rem;
      }

      .nav-icon {
        margin: 0;
      }

      .user-avatar {
        margin: 0;
      }

      .user-info {
        justify-content: center;
      }

      .logout-button span {
        display: none;
      }
    }
  `]
})
export class SidebarComponent implements OnInit {
  user$: Observable<AppUser | null>;
  
  menuItems = [
    {
      icon: 'video_call',
      label: 'LifeCall',
      route: '/calls'
    },
    {
      icon: 'description',
      label: 'Rapports',
      route: '/reports'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.user$ = this.authService.user$;
  }

  ngOnInit(): void {}

  async logout() {
    try {
      await this.authService.signOut();
      await this.router.navigate(['/login']);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  }
}

import { Component } from '@angular/core';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { RouterOutlet } from '@angular/router';
import { FlexModule } from '@ngbracket/ngx-layout';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth/auth.service';
import { LayoutService } from './services/layout/layout.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    RouterOutlet,
    FlexModule,
    AsyncPipe
  ],
  template: `
    <ng-container *ngIf="(authService.user$ | async); else loginLayout">
      <div fxLayout="row" fxLayoutAlign="start stretch">
        <ng-container *ngIf="layoutService.showSidebar$ | async">
          <app-sidebar fxFlex="15"></app-sidebar>
        </ng-container>
        <router-outlet></router-outlet>
      </div>
    </ng-container>
    <ng-template #loginLayout>
      <router-outlet></router-outlet>
    </ng-template>
  `,
  styleUrl: './app.component.css'
})
export class AppComponent {
  public ems = false;
  constructor(
    public authService: AuthService,
    public layoutService: LayoutService
  ) {}
}

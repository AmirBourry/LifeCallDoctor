import { Component } from '@angular/core';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { RouterOutlet } from '@angular/router';
import { FlexModule } from '@ngbracket/ngx-layout';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    RouterOutlet,
    FlexModule
  ],
  template: `
    <ng-container *ngIf="(authService.user$ | async); else loginLayout">
      <div fxLayout="row" fxLayoutAlign="start stretch">
        <app-sidebar fxFlex="15"></app-sidebar>
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
  constructor(public authService: AuthService) {}
}

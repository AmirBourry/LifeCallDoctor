import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatDivider } from '@angular/material/divider';
import { FlexModule } from '@ngbracket/ngx-layout';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

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
    MatIconModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  constructor(public authService: AuthService) {}

  logout() {
    this.authService.logout();
  }
}

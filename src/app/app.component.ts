import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { filter, map } from 'rxjs/operators';
import { Observable, combineLatest } from 'rxjs';
import { AuthService } from './services/auth/auth.service';
import {VitalSignsService} from './services/vital-signs.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  template: `
    <div class="app-container">
      <app-sidebar *ngIf="showSidebar$ | async"></app-sidebar>
      <main [class.withSidebar]="showSidebar$ | async">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      position: relative;
    }

    main {
      flex: 1;
      overflow: auto;
      position: relative;
      width: 100%;
      transition: margin-left 0.3s ease, width 0.3s ease;
    }

    .withSidebar {
      margin-left: 280px;
      width: calc(100% - 280px);
    }

    ::ng-deep .content-container {
      max-width: 100%;
      margin: 0 auto;
      padding: 0;
      box-sizing: border-box;
    }
  `]
})
export class AppComponent {
  showSidebar$: Observable<boolean>;

  constructor(private router: Router, private authService: AuthService, private webSocketService: VitalSignsService) {
    this.showSidebar$ = combineLatest([
      this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map(event => event.urlAfterRedirects)
      ),
      this.authService.user$
    ]).pipe(
      map(([url, user]) => {
        const routesWithoutSidebar = ['/login', '/register', '/nurse'];
        return !routesWithoutSidebar.includes(url) && user?.role === 'medecin';
      })
    );
  }
}

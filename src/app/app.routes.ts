import { Routes } from '@angular/router';
import { CallsComponent } from './components/calls/calls.component';
import { authGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { ProfileGuard } from './guards/profile.guard';
import { RegisterComponent } from './components/auth/register/register.component';
import { LoginComponent } from './components/auth/login/login.component';
import { NurseViewComponent } from './components/nurse/nurse-view.component';
import { SensorMockComponent } from './components/sensor-mock/sensor-mock.component';

export const routes: Routes = [
  { 
    path: '', 
    redirectTo: '/login', 
    pathMatch: 'full' 
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'sensors',
    component: SensorMockComponent,
    data: { role: 'infirmier' }
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'calls',
    component: CallsComponent,
    canActivate: [authGuard, ProfileGuard, RoleGuard],
    data: { role: 'medecin' }
  },
  {
    path: 'nurse',
    component: NurseViewComponent,
    canActivate: [authGuard, ProfileGuard, RoleGuard],
    data: { role: 'infirmier' }
  },
  {
    path: 'reports',
    loadComponent: () => 
      import('./components/reports/reports.component').then(m => m.ReportsComponent),
    canActivate: [authGuard, ProfileGuard, RoleGuard],
    data: { role: 'medecin' }
  },
  { 
    path: '**', 
    redirectTo: '/login' 
  }
];

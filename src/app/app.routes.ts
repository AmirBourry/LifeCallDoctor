import { Routes } from '@angular/router';
import { DoctorComponent } from './components/doctor/doctor.component';
import { LoginComponent } from './components/auth/login/login.component';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';

export const routes: Routes = [
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: [loginGuard]
  },
  { 
    path: 'doctor', 
    component: DoctorComponent,
    canActivate: [authGuard]
  },
  { 
    path: '', 
    redirectTo: '/doctor', 
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/doctor'
  }
];

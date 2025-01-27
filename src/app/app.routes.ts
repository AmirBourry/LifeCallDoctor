import { Routes } from '@angular/router';
import { DoctorComponent } from './components/doctor/doctor.component';
import { LoginComponent } from './components/auth/login/login.component';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';
import {CallsComponent} from './components/calls/calls.component';
import {WebRTCTestComponent} from './components/calls/test-webrtc.component';
import {EmsComponent} from './components/ems/ems.component';

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
    path: 'ems',
    component: EmsComponent,
  },
  {
    path: 'doctor/calls',
    component: CallsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'test-webrtc',
    component: WebRTCTestComponent
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

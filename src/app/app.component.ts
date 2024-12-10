import { Component } from '@angular/core';
import {SidebarComponent} from './components/sidebar/sidebar.component';
import {DoctorComponent} from './components/doctor/doctor.component';
import {NgIf} from '@angular/common';
import {RouterOutlet} from '@angular/router';
import {FlexModule} from '@ngbracket/ngx-layout';

@Component({
  selector: 'app-root',
  imports: [
    SidebarComponent,
    DoctorComponent,
    NgIf,
    RouterOutlet,
    FlexModule
  ],
  templateUrl: './app.component.html',
  standalone: true,
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'LifeCallDoctor';
}

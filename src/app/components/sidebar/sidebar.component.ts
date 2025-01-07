import {Component, EventEmitter, Output} from '@angular/core';
import {FlexModule} from '@ngbracket/ngx-layout';
import {MatButton} from '@angular/material/button';
import {MatDivider} from '@angular/material/divider';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [
    FlexModule,
    MatButton,
    MatDivider,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './sidebar.component.html',
  standalone: true,
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  public selectedTab = 'Home';

  public tabs = [
    { name: 'Home', route: 'home' },
    { name: 'Doctor', route: 'doctor' },
    { name: 'Doctor Calls', route: 'doctor/calls' },
    { name: 'Nice Doctor', route: 'nice/doctor' },
    { name: 'Nice Staff', route: 'nice/staff' },
    { name: 'Nice EMS', route: 'nice/ems' },
    { name: 'Lenval Doctor' , route: 'lenval/doctor' },
    { name: 'Lenval Staff', route: 'lenval/staff' },
    { name: 'Lenval EMS', route: 'lenval/ems' },
  ];

  public constructor(public router: Router){}

}

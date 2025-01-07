import { Component } from '@angular/core';
import {FlexModule} from '@ngbracket/ngx-layout';
import {MatButton} from '@angular/material/button';
import {CallItemComponent} from './call-item/call-item.component';
import {NgForOf} from '@angular/common';

@Component({
  selector: 'app-calls',
  imports: [
    FlexModule,
    MatButton,
    CallItemComponent,
    NgForOf
  ],
  templateUrl: './calls.component.html',
  standalone: true,
  styleUrl: './calls.component.css'
})

export class CallsComponent {
  activeFilter: 'priority' | 'time' = 'priority';

  calls = [
    {
      priority: 5,
      type: 'Accident de voiture',
      address: '5 Boulevard Marchand',
      city: '06600 Antibes',
      time: '12:54'
    },
    {
      priority: 2,
      type: 'Accident de voiture',
      address: '5 Boulevard Marchand',
      city: '06600 Antibes',
      time: '15:02'
    },
    {
      priority: 1,
      type: 'Accident de voiture',
      address: '5 Boulevard Marchand',
      city: '06600 Antibes',
      time: '11:00'
    },
    {
      priority: 5,
      type: 'Accident de voiture',
      address: '5 Boulevard Marchand',
      city: '06600 Antibes',
      time: '12:54'
    },
    {
      priority: 2,
      type: 'Accident de voiture',
      address: '5 Boulevard Marchand',
      city: '06600 Antibes',
      time: '15:02'
    },
    {
      priority: 1,
      type: 'Accident de voiture',
      address: '5 Boulevard Marchand',
      city: '06600 Antibes',
      time: '11:00'
    },
    {
      priority: 5,
      type: 'Accident de voiture',
      address: '5 Boulevard Marchand',
      city: '06600 Antibes',
      time: '12:54'
    },
    {
      priority: 2,
      type: 'Accident de voiture',
      address: '5 Boulevard Marchand',
      city: '06600 Antibes',
      time: '15:02'
    },
    {
      priority: 1,
      type: 'Accident de voiture',
      address: '5 Boulevard Marchand',
      city: '06600 Antibes',
      time: '11:00'
    },
    {
      priority: 5,
      type: 'Accident de voiture',
      address: '5 Boulevard Marchand',
      city: '06600 Antibes',
      time: '12:54'
    },
    {
      priority: 2,
      type: 'Accident de voiture',
      address: '5 Boulevard Marchand',
      city: '06600 Antibes',
      time: '15:02'
    },
    {
      priority: 1,
      type: 'Accident de voiture',
      address: '5 Boulevard Marchand',
      city: '06600 Antibes',
      time: '11:00'
    },
    {
      priority: 5,
      type: 'Accident de voiture',
      address: '5 Boulevard Marchand',
      city: '06600 Antibes',
      time: '12:54'
    },
    {
      priority: 2,
      type: 'Accident de voiture',
      address: '5 Boulevard Marchand',
      city: '06600 Antibes',
      time: '15:02'
    },
    {
      priority: 1,
      type: 'Accident de voiture',
      address: '5 Boulevard Marchand',
      city: '06600 Antibes',
      time: '11:00'
    }
  ];
}

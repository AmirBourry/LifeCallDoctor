import { Component } from '@angular/core';
import {MatFormField, MatFormFieldModule, MatLabel} from '@angular/material/form-field';
import {MatOption, MatSelect} from '@angular/material/select';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardModule,
  MatCardTitle
} from '@angular/material/card';
import {CommonModule, NgClass} from '@angular/common';
import {MatDivider} from '@angular/material/divider';
import {FlexModule} from '@ngbracket/ngx-layout';
import {MatChipsModule} from '@angular/material/chips';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-following',
  imports: [
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatChipsModule,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    NgClass,
    MatCardContent,
    MatDivider,
    MatCardActions,
    FlexModule
  ],
  templateUrl: './following.component.html',
  standalone: true,
  styleUrl: './following.component.css'
})
export class FollowingComponent {
  patients = [
    {
      name: 'Jean Dupont',
      status: 'Stable',
      bloodPressure: '120/80',
      temperature: 36.8,
      heartRate: 75,
      spo2: 98,
      lastNote: 'Patient stable. Poursuite du traitement actuel.'
    },
  ];
}

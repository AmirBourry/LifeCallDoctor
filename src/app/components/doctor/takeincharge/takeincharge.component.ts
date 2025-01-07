import { Component } from '@angular/core';
import {FlexModule} from '@ngbracket/ngx-layout';
import {MatIcon} from '@angular/material/icon';
import {MatButton} from '@angular/material/button';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader, MatCardModule,
  MatCardSubtitle,
  MatCardTitle
} from '@angular/material/card';
import {MatList, MatListItem} from '@angular/material/list';
import {CommonModule, DatePipe, NgForOf} from '@angular/common';
import {MatLine} from '@angular/material/core';
import {MatPaginator} from '@angular/material/paginator';
import {FormsModule} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatChipsModule} from '@angular/material/chips';

@Component({
  selector: 'app-takeincharge',
  imports: [
    FlexModule,
    MatIcon,
    MatButton,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatCardSubtitle,
    MatCardTitle,
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatChipsModule,
    MatList,
    MatListItem,
    DatePipe,
    MatLine,
    MatCardActions,
    MatPaginator,
    NgForOf
  ],
  templateUrl: './takeincharge.component.html',
  standalone: true,
  styleUrl: './takeincharge.component.css'
})
export class TakeinchargeComponent {
  patients = [
    {
      name: 'Jean Dupont',
      id: 'PAT-001',
      admissionDate: new Date(),
      service: 'Urgences',
      doctor: 'Dr. Martin'
    },
    // Add more mock data as needed
  ];
}

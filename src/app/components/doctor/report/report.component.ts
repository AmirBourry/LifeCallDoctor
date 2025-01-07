import { Component } from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {MatCard, MatCardModule} from '@angular/material/card';
import {MatFormField, MatFormFieldModule} from '@angular/material/form-field';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow, MatHeaderRowDef, MatRow, MatRowDef,
  MatTable
} from '@angular/material/table';
import {CommonModule, DatePipe} from '@angular/common';
import {FlexModule} from '@ngbracket/ngx-layout';
import {MatButton, MatIconButton} from '@angular/material/button';
import {MatInput} from '@angular/material/input';
import {MatChip, MatChipListbox, MatChipsModule} from '@angular/material/chips';
import {MatMenu, MatMenuItem, MatMenuTrigger} from '@angular/material/menu';
import {MatPaginator} from '@angular/material/paginator';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-report',
  imports: [
    MatIcon,
    MatCard,
    MatFormField,
    MatTable,
    MatCellDef,
    DatePipe,
    MatColumnDef,
    MatHeaderCell,
    MatCell,
    MatHeaderCellDef,
    FlexModule,
    MatButton,
    MatInput,
    MatChip,
    MatChipListbox,
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconButton,
    MatChipsModule,
    MatMenuTrigger,
    MatMenu,
    MatPaginator,
    MatMenuItem,
    MatHeaderRow,
    MatRow,
    MatHeaderRowDef,
    MatRowDef
  ],
  templateUrl: './report.component.html',
  standalone: true,
  styleUrl: './report.component.css'
})
export class ReportComponent {
  displayedColumns: string[] = ['date', 'patient', 'type', 'status', 'actions'];
  reports = [
    { date: new Date(), patient: 'Jean Dupont', type: 'Urgence', status: 'En cours' },
    { date: new Date(), patient: 'Marie Martin', type: 'Consultation', status: 'Terminé' },
    { date: new Date(), patient: 'Ziad Bouhlel', type: 'Consultation', status: 'En cours' },
  ];
}

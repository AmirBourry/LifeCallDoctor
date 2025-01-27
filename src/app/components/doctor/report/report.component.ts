import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FlexModule } from '@ngbracket/ngx-layout';
import { InterventionService, Intervention, Patient, Personnel } from '../../../services/intervention/intervention.service';
import { Observable, combineLatest, map } from 'rxjs';

interface ReportData {
  intervention: Intervention;
  patient: Patient | null;
  medecin: Personnel | null;
  infirmier: Personnel | null;
}

@Component({
  selector: 'app-report-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule
  ],
  template: `
    <h2 mat-dialog-title>Détails du rapport</h2>
    <mat-dialog-content>
      <div class="details-content" *ngIf="data">
        <section>
          <h3>Patient</h3>
          <p>Nom: {{data.patient?.nom}} {{data.patient?.prenom}}</p>
          <p>Date de naissance: {{data.patient?.dateNaissance}}</p>
          <p>N° Sécu: {{data.patient?.numeroSecu}}</p>
        </section>

        <section>
          <h3>Équipe médicale</h3>
          <p>Médecin: Dr. {{data.medecin?.nom}} {{data.medecin?.prenom}}</p>
          <p>Infirmier: {{data.infirmier?.nom}} {{data.infirmier?.prenom}}</p>
        </section>

        <section>
          <h3>Intervention</h3>
          <p>Début: {{formatDate(data.intervention.startTime)}}</p>
          <p>Fin: {{data.intervention.endTime ? formatDate(data.intervention.endTime) : 'En cours'}}</p>
          <p>Statut: {{data.intervention.status === 'en_cours' ? 'En cours' : 'Terminée'}}</p>
        </section>

        <section>
          <h3>Constantes vitales</h3>
          <div class="vitals-grid">
            <div class="vital-item">
              <span class="vital-label">SpO2</span>
              <span class="vital-value">{{data.intervention.currentVitals.values.spo2}}%</span>
            </div>
            <div class="vital-item">
              <span class="vital-label">ECG</span>
              <span class="vital-value">{{data.intervention.currentVitals.values.ecg}} bpm</span>
            </div>
            <div class="vital-item">
              <span class="vital-label">Tension</span>
              <span class="vital-value">{{data.intervention.currentVitals.values.nibp}} mmHg</span>
            </div>
            <div class="vital-item">
              <span class="vital-label">Température</span>
              <span class="vital-value">{{data.intervention.currentVitals.values.temperature}}°C</span>
            </div>
          </div>
        </section>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Fermer</button>
      <button mat-raised-button color="primary">
        <mat-icon>print</mat-icon>
        Imprimer
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .details-content {
      padding: 16px;
    }
    section {
      margin-bottom: 24px;
    }
    h3 {
      color: #1D192B;
      margin-bottom: 12px;
      font-size: 16px;
      font-weight: 500;
    }
    .vitals-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .vital-item {
      background: #F7F2FA;
      padding: 12px;
      border-radius: 8px;
      text-align: center;
    }
    .vital-label {
      display: block;
      color: #49454F;
      font-size: 12px;
      margin-bottom: 4px;
    }
    .vital-value {
      font-size: 18px;
      font-weight: 500;
      color: #1D192B;
    }
  `]
})
export class ReportDetailsDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ReportData,
    public dialogRef: MatDialogRef<ReportDetailsDialogComponent>
  ) {}

  formatDate(timestamp: any): string {
    if (!timestamp) return '';
    return new Date(timestamp.seconds * 1000).toLocaleString();
  }
}

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    FlexModule
  ],
  template: `
    <div class="container" fxLayout="column" fxLayoutGap="16px">
      <div class="header" fxLayout="row" fxLayoutAlign="space-between center">
        <h1>Rapports d'intervention</h1>
      </div>

      <ng-container *ngIf="reports$ | async as reports">
        <div *ngIf="!loading && reports.length === 0" class="empty-state">
          <mat-icon>assignment</mat-icon>
          <h2>Aucun rapport disponible</h2>
          <p>Les rapports d'intervention s'afficheront ici une fois créés.</p>
        </div>

        <div *ngIf="reports.length > 0" class="reports-grid">
          <mat-card *ngFor="let report of reports" class="report-card">
            <div class="status-badge" [class.status-active]="report.intervention.status === 'en_cours'">
              {{ report.intervention.status === 'en_cours' ? 'En cours' : 'Terminée' }}
            </div>
            <mat-card-header>
              <mat-card-title>
                {{ report.patient?.nom || 'Patient inconnu' }} {{ report.patient?.prenom || '' }}
              </mat-card-title>
            </mat-card-header>

            <mat-card-content>
              <div class="quick-info">
                <div class="info-item">
                  <mat-icon>schedule</mat-icon>
                  <span>{{ formatDate(report.intervention.startTime) }}</span>
                </div>
                <div class="info-item">
                  <mat-icon>medical_services</mat-icon>
                  <span>Dr. {{ report.medecin?.nom || 'Non assigné' }}</span>
                </div>
              </div>
            </mat-card-content>

            <mat-card-actions align="end">
              <button mat-button color="primary" (click)="openDetails(report)">
                <mat-icon>visibility</mat-icon>
                DÉTAILS
              </button>
            </mat-card-actions>
          </mat-card>
        </div>
      </ng-container>

      <div *ngIf="loading" class="loading-state">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Chargement des rapports...</p>
      </div>
    </div>
  `,
  styles: [`
    .container {
      padding: 24px;
      background-color: #F7F2FA;
      min-height: calc(100vh - 48px);
    }

    .reports-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
      padding: 16px;
    }

    .report-card {
      border-radius: 12px;
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
      overflow: visible;
      padding-top: 16px;
      margin-top: 12px;
    }

    .status-badge {
      position: absolute;
      top: 12px;
      right: 16px;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      background-color: #E6E1E5;
      color: #49454F;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 1;
    }

    .status-badge.status-active {
      background-color: #D0BCFF;
      color: #381E72;
    }

    .report-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .quick-info {
      margin-top: 16px;
    }

    .info-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      color: #49454F;
    }

    .info-item mat-icon {
      margin-right: 8px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    mat-card-title {
      font-size: 18px;
      margin-bottom: 8px;
      padding-right: 0;
    }

    mat-card-header {
      margin-bottom: 16px;
      padding-right: 100px;
    }
  `]
})
export class ReportComponent implements OnInit {
  reports$: Observable<ReportData[]>;
  loading = true;

  constructor(
    private interventionService: InterventionService,
    private dialog: MatDialog
  ) {
    this.reports$ = combineLatest([
      this.interventionService.getInterventions(),
      this.interventionService.getPatients(),
      this.interventionService.getPersonnel()
    ]).pipe(
      map(([interventions, patients, personnel]) => {
        this.loading = false;
        return interventions.map(intervention => {
          const patient = patients.find(p => p.id === intervention.patientId) || null;
          const equipe = personnel.filter(p => p.id === intervention.equipeId);
          const medecin = equipe.find(p => p.role === 'medecin') || null;
          const infirmier = equipe.find(p => p.role === 'infirmier') || null;
          
          return {
            intervention,
            patient,
            medecin,
            infirmier
          };
        });
      })
    );
  }

  ngOnInit(): void {}

  getStatusColor(status: string): string {
    return status === 'en_cours' ? 'accent' : 'primary';
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '';
    return new Date(timestamp.seconds * 1000).toLocaleString();
  }

  openDetails(report: ReportData) {
    this.dialog.open(ReportDetailsDialogComponent, {
      data: report,
      width: '600px'
    });
  }
}

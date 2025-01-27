import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FlexModule } from '@ngbracket/ngx-layout';
import { InterventionService, Intervention, Patient, Personnel } from '../../services/intervention/intervention.service';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, delay, catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth/auth.service';
import { Timestamp } from '@angular/fire/firestore';

interface ReportData {
  intervention: Intervention;
  patient: Patient | null;
  medecin: Personnel | null;
  infirmier: Personnel | null;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    FlexModule
  ],
  template: `
    <div class="container">
      <div class="header">
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
              <div mat-card-avatar class="patient-avatar">
                <mat-icon>person</mat-icon>
              </div>
              <mat-card-title>{{ report.patient?.nom || 'Patient inconnu' }} {{ report.patient?.prenom || '' }}</mat-card-title>
              <mat-card-subtitle>
                N° Sécu: {{ report.patient?.numeroSecu || 'Non renseigné' }}
              </mat-card-subtitle>
            </mat-card-header>

            <mat-card-content>
              <div class="info-section">
                <h3>Équipe médicale</h3>
                <div class="medical-team">
                  <div class="team-member">
                    <mat-icon>medical_services</mat-icon>
                    <span>Dr. {{ report.medecin?.nom || 'Non assigné' }}</span>
                  </div>
                  <div class="team-member">
                    <mat-icon>local_hospital</mat-icon>
                    <span>{{ report.infirmier?.nom || 'Non assigné' }}</span>
                  </div>
                </div>
              </div>

              <div class="vitals-grid">
                <div class="vital-sign">
                  <span class="vital-label">SpO2</span>
                  <span class="vital-value">{{ report.intervention.currentVitals.values.spo2 }}%</span>
                </div>
                <div class="vital-sign">
                  <span class="vital-label">ECG</span>
                  <span class="vital-value">{{ report.intervention.currentVitals.values.ecg }} bpm</span>
                </div>
                <div class="vital-sign">
                  <span class="vital-label">Tension</span>
                  <span class="vital-value">{{ report.intervention.currentVitals.values.nibp }} mmHg</span>
                </div>
                <div class="vital-sign">
                  <span class="vital-label">Température</span>
                  <span class="vital-value">{{ report.intervention.currentVitals.values.temperature }}°C</span>
                </div>
              </div>

              <div class="intervention-info">
                <div class="info-item">
                  <mat-icon>schedule</mat-icon>
                  <span>Début: {{ formatDate(report.intervention.startTime) }}</span>
                </div>
                <div class="info-item" *ngIf="report.intervention.endTime">
                  <mat-icon>event_available</mat-icon>
                  <span>Fin: {{ formatDate(report.intervention.endTime) }}</span>
                </div>
              </div>
            </mat-card-content>

            <mat-card-actions align="end">
              <button mat-button color="primary" (click)="openDetails(report)">
                <mat-icon>visibility</mat-icon>
                DÉTAILS
              </button>
              <button mat-button color="accent">
                <mat-icon>print</mat-icon>
                IMPRIMER
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

    .header {
      margin-bottom: 24px;
    }

    .header h1 {
      color: #1D192B;
      font-size: 28px;
      font-weight: 500;
      margin: 0;
    }

    .reports-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
      padding: 8px;
    }

    .report-card {
      border-radius: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
      overflow: visible;
      background: white;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .report-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 12px rgba(0,0,0,0.15);
    }

    .status-badge {
      position: absolute;
      top: -12px;
      right: 16px;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      background-color: #E6E1E5;
      color: #49454F;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .status-badge.status-active {
      background-color: #D0BCFF;
      color: #381E72;
    }

    .patient-avatar {
      background-color: #E8DEF8;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .patient-avatar mat-icon {
      color: #6750A4;
    }

    .info-section {
      margin: 16px 0;
    }

    .info-section h3 {
      color: #49454F;
      font-size: 14px;
      margin: 0 0 8px 0;
      font-weight: 500;
    }

    .medical-team {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .team-member {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #49454F;
    }

    .vitals-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin: 16px 0;
      padding: 16px;
      background: #F7F2FA;
      border-radius: 12px;
    }

    .vital-sign {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .vital-label {
      font-size: 12px;
      color: #49454F;
      margin-bottom: 4px;
    }

    .vital-value {
      font-size: 18px;
      font-weight: 500;
      color: #1D192B;
    }

    .intervention-info {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #E6E1E5;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #49454F;
      margin-bottom: 8px;
    }

    .empty-state {
      text-align: center;
      padding: 48px;
      background: white;
      border-radius: 16px;
      margin: 24px;
    }

    .empty-state mat-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      color: #6750A4;
      margin-bottom: 16px;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
    }

    @media (max-width: 600px) {
      .reports-grid {
        grid-template-columns: 1fr;
      }

      .container {
        padding: 16px;
      }

      .vitals-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ReportsComponent implements OnInit {
  reports$: Observable<ReportData[]>;
  loading = true;

  constructor(
    private interventionService: InterventionService,
    private authService: AuthService
  ) {
    this.reports$ = this.authService.user$.pipe(
      delay(1000),
      switchMap(user => {
        if (!user) {
          console.log('User not authenticated, skipping data fetch');
          return of([]);
        }
        console.log('User authenticated, fetching data:', user);

        return combineLatest([
          this.interventionService.getInterventions(),
          this.interventionService.getPatients(),
          this.interventionService.getPersonnel()
        ]).pipe(
          map(([interventions, patients, personnel]) => {
            console.log('Data received:', { interventions, patients, personnel });
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
          }),
          catchError(error => {
            console.error('Error fetching data:', error);
            this.loading = false;
            return of([]);
          })
        );
      })
    );
  }

  ngOnInit(): void {}

  getStatusColor(status: string): string {
    return status === 'en_cours' ? 'accent' : 'primary';
  }

  formatDate(timestamp: Timestamp | null): string {
    if (!timestamp) return 'Non défini';
    
    const date = timestamp.toDate();
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  openDetails(report: ReportData): void {
    // TODO: Implémenter l'ouverture des détails
    console.log('Opening details for report:', report);
  }
} 
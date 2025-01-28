import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Chart } from 'chart.js/auto';
import { ActivatedRoute, Router } from '@angular/router';
import { CallReport } from '../../interfaces/call-report.interface';
import { CallReportService } from '../../services/call-report.service';

@Component({
  selector: 'app-call-report',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="report-container">
      <mat-card class="report-card">
        <mat-card-header>
          <mat-card-title>Rapport d'appel</mat-card-title>
          <mat-card-subtitle>
            Dr. {{report?.doctor?.nom}} {{report?.doctor?.prenom}} - 
            {{report?.nurse?.nom}} {{report?.nurse?.prenom}}
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div class="duration-info">
            <h3>Durée de l'appel: {{formatDuration(report?.duration || 0)}}</h3>
            <p>Début: {{formatTime(report?.startTime || 0)}}</p>
            <p>Fin: {{formatTime(report?.endTime || 0)}}</p>
          </div>

          <div class="charts-container">
            <canvas #vitalsChart></canvas>
          </div>

          <div class="transcription-container">
            <h3>Transcription de l'appel</h3>
            <div class="transcription-content">
              <p *ngFor="let text of report?.transcription">{{text}}</p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .report-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .report-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .duration-info {
      margin: 2rem 0;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .charts-container {
      margin: 2rem 0;
      height: 400px;
    }

    .transcription-container {
      margin: 2rem 0;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .transcription-content {
      max-height: 300px;
      overflow-y: auto;
      padding: 1rem;
    }
  `]
})
export class CallReportComponent implements OnInit, OnDestroy {
  report: CallReport | null = null;
  private chart: Chart | null = null;

  constructor(
    private callReportService: CallReportService,
    private router: Router
  ) {}

  ngOnInit() {
    this.callReportService.currentReport$.subscribe(report => {
      if (!report) {
        this.router.navigate(['/']);
        return;
      }
      this.report = report;
      this.initializeChart();
    });
  }

  ngOnDestroy() {
    this.callReportService.clearReport();
  }

  private initializeChart() {
    if (!this.report) return;

    console.log('===== CALL REPORT =====');
    console.log(this.report);

    const ctx = document.querySelector('canvas')?.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.report.vitals.map(v => new Date(v.timestamp!).toLocaleTimeString()),
        datasets: [
          {
            label: 'SpO2',
            data: this.report.vitals.map(v => v.spo2),
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          },
          {
            label: 'BPM',
            data: this.report.vitals.map(v => v.ecg),
            borderColor: 'rgb(255, 99, 132)',
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}min ${remainingSeconds}s`;
  }

  formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }
} 
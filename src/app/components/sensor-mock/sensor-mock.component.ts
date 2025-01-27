import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, Chart } from 'chart.js';
import {
  LinearScale,
  CategoryScale,
  PointElement,
  LineElement,
  LineController,
  Filler,
  Legend,
  Title
} from 'chart.js';
import { SensorMockService, VitalSigns, ScenarioType } from '../../services/sensor/sensor-mock.service';
import { Subscription } from 'rxjs';
import { LayoutService } from '../../services/layout/layout.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-sensor-mock',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatSliderModule,
    MatSelectModule,
    FormsModule,
    BaseChartDirective
  ],
  templateUrl: './sensor-mock.component.html',
  styleUrls: ['./sensor-mock.component.css']
})
export class SensorMockComponent implements OnInit, OnDestroy {
  currentVitals: VitalSigns | null = null;
  private subscription: Subscription | null = null;

  // Configuration des graphiques
  chartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { display: false },
      x: { display: false }
    },
    plugins: {
      legend: { display: false }
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 1
      },
      point: {
        radius: 0
      }
    }
  };

  ecgChartData: ChartConfiguration['data'] = {
    datasets: [{
      data: [],
      borderColor: 'rgba(75,192,192,0.4)',
      fill: true,
      backgroundColor: 'rgba(75,192,192,0.1)'
    }],
    labels: []
  };

  spo2ChartData: ChartConfiguration['data'] = {
    datasets: [{
      data: [],
      borderColor: 'rgba(54, 162, 235, 0.4)',
      fill: true,
      backgroundColor: 'rgba(54, 162, 235, 0.1)'
    }],
    labels: []
  };

  nibpChartData: ChartConfiguration['data'] = {
    datasets: [{
      data: [],
      borderColor: 'rgba(255, 99, 132, 0.4)',
      fill: true,
      backgroundColor: 'rgba(255, 99, 132, 0.1)'
    }],
    labels: []
  };

  temperatureChartData: ChartConfiguration['data'] = {
    datasets: [{
      data: [],
      borderColor: 'rgba(255, 159, 64, 0.4)',
      fill: true,
      backgroundColor: 'rgba(255, 159, 64, 0.1)'
    }],
    labels: []
  };

  constructor(
    private readonly sensorService: SensorMockService,
    private readonly layoutService: LayoutService,
    private readonly cdr: ChangeDetectorRef
  ) {
    // Enregistrer tous les composants nécessaires de Chart.js
    Chart.register(
      LinearScale,
      CategoryScale,
      PointElement,
      LineElement,
      LineController,
      Filler,
      Legend,
      Title
    );

    // Initialiser les données du graphique avec des valeurs de test
    for (let i = 0; i < 30; i++) {
      this.ecgChartData.labels?.push('');
      this.ecgChartData.datasets[0].data.push(Math.random() * 40 + 60);
      this.spo2ChartData.datasets[0].data.push(Math.random() * 5 + 95);
      this.nibpChartData.datasets[0].data.push(Math.random() * 40 + 80);
      this.temperatureChartData.datasets[0].data.push(Math.random() * 1 + 36.5);
    }

    // Masquer la sidebar immédiatement
    this.layoutService.toggleSidebar(false);
  }

  ngOnInit() {
    // Déplacer la logique de la sidebar du ngOnInit vers le constructeur
    this.subscription = this.sensorService.getVitalSigns().subscribe(vitals => {
      if (vitals) {
        this.currentVitals = vitals;
        this.updateCharts(vitals);
        // Forcer la détection des changements après la mise à jour
        this.cdr.detectChanges();
      }
    });
  }

  private updateCharts(vitals: VitalSigns) {
    const maxDataPoints = 60; // 1 minute d'historique

    // Mise à jour ECG
    this.updateChartData(this.ecgChartData, vitals.ecg, maxDataPoints);
    this.updateChartData(this.spo2ChartData, vitals.spo2, maxDataPoints);
    this.updateChartData(this.nibpChartData, vitals.nibp.systolic, maxDataPoints);
    this.updateChartData(this.temperatureChartData, vitals.temperature, maxDataPoints);
  }

  private updateChartData(chartData: ChartConfiguration['data'], newValue: number, maxPoints: number) {
    if (chartData.datasets[0].data.length >= maxPoints) {
      chartData.datasets[0].data.shift();
      chartData.labels?.shift();
    }

    chartData.datasets[0].data.push(newValue);
    chartData.labels?.push('');
  }

  ngOnDestroy() {
    this.layoutService.toggleSidebar(true);
    this.subscription?.unsubscribe();
  }

  setScenario(scenario: ScenarioType) {
    this.sensorService.setScenario(scenario);
  }

  injectAnomaly(parameter: keyof VitalSigns, value: number) {
    this.sensorService.injectAnomaly(parameter, value);
  }

  simulateHardwareFailure() {
    this.sensorService.simulateHardwareFailure();
  }

  isValueNormal(parameter: string, value: number): boolean {
    const ranges = this.sensorService.NORMAL_RANGES;
    switch (parameter) {
      case 'ecg':
        return value >= ranges.ecg.min && value <= ranges.ecg.max;
      case 'spo2':
        return value >= ranges.spo2.min && value <= ranges.spo2.max;
      case 'temperature':
        return value >= ranges.temperature.min && value <= ranges.temperature.max;
      default:
        return true;
    }
  }
}

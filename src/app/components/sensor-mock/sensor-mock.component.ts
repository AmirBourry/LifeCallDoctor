import { Component, OnInit, OnDestroy, ViewChildren, QueryList } from '@angular/core';
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
  @ViewChildren(BaseChartDirective) charts!: QueryList<BaseChartDirective>;
  
  currentVitals: VitalSigns | null = null;
  private subscription: Subscription | null = null;

  currentScenarioDescription: string = '';
  
  scenarioDescriptions: Record<ScenarioType, string> = {
    'normal': 'Les constantes vitales sont normales : fréquence cardiaque entre 60-100 BPM, saturation en oxygène > 95%, tension artérielle autour de 120/80 mmHg et température entre 36.5-37.2°C.',
    
    'hyperthermia': 'L\'hyperthermie se manifeste par une température corporelle élevée (>39.5°C), accompagnée d\'une tachycardie (>100 BPM), d\'une tension artérielle basse et d\'une saturation en oxygène légèrement diminuée due à l\'augmentation du métabolisme.',
    
    'hypothermia': 'L\'hypothermie se caractérise par une température corporelle basse (<35°C), une bradycardie (<50 BPM), une tension artérielle basse et une saturation en oxygène diminuée en raison du ralentissement métabolique.',
    
    'hemorrhagic': 'L\'état hémorragique présente une tachycardie compensatoire (>120 BPM), une hypotension sévère (<90 mmHg systolique), une saturation en oxygène basse (<90%) et une température normale à basse due à la perte de sang.',
    
    'cardiac_arrest': 'La crise cardiaque se manifeste par une tachycardie sévère (>150 BPM), une hypertension importante (>180/100 mmHg), une saturation en oxygène critique (<85%) et une température normale mais avec des sueurs froides.',
    
    'asthma': 'La crise d\'asthme se caractérise par une tachycardie modérée (100-120 BPM), une saturation en oxygène diminuée (<90%) due à la bronchoconstriction, une tension artérielle légèrement élevée et une température normale.',
    
    'emergency': 'Situation d\'urgence...',
    
    'recovery': 'Phase de récupération...'
  };

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

  activeScenario: ScenarioType = 'normal';

  constructor(
    private readonly sensorService: SensorMockService,
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

    // Démarrer le scénario normal par défaut
    this.sensorService.setScenario('normal');
    
    // Initialiser avec la description du scénario normal
    this.currentScenarioDescription = this.scenarioDescriptions['normal'];
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

    // Forcer la mise à jour de tous les graphiques
    this.charts?.forEach(chart => {
      if (chart && chart.chart) {
        chart.chart.update('none'); // 'none' pour une mise à jour plus rapide
      }
    });
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
    this.subscription?.unsubscribe();
  }

  setScenario(scenario: ScenarioType) {
    this.activeScenario = scenario;
    this.sensorService.setScenario(scenario);
    this.currentScenarioDescription = this.scenarioDescriptions[scenario];
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

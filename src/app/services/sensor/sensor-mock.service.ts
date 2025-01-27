import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

export interface VitalHistory {
  timestamps: number[];
  values: number[];
}

export interface VitalSignsHistory {
  ecg: VitalHistory;
  spo2: VitalHistory;
  nibp: { systolic: VitalHistory; diastolic: VitalHistory };
  temperature: VitalHistory;
}

export interface VitalSigns {
  timestamp: number;
  ecg: number;
  spo2: number;
  nibp: { systolic: number; diastolic: number };
  temperature: number;
  scenario: ScenarioType;
}

export type ScenarioType = 'normal' | 'emergency' | 'recovery' | 'hyperthermia' | 'hypothermia' | 'hemorrhagic' | 'cardiac_arrest' | 'asthma';

@Injectable({
  providedIn: 'root'
})
export class SensorMockService {
  private socket$: WebSocketSubject<any>;
  private vitalSignsSubject = new BehaviorSubject<VitalSigns | null>(null);
  private currentScenario: ScenarioType = 'normal';
  private readonly MAX_HISTORY_POINTS = 60; // 1 minute d'historique
  private vitalSignsHistory: VitalSignsHistory = {
    ecg: { timestamps: [], values: [] },
    spo2: { timestamps: [], values: [] },
    nibp: {
      systolic: { timestamps: [], values: [] },
      diastolic: { timestamps: [], values: [] }
    },
    temperature: { timestamps: [], values: [] }
  };

  readonly NORMAL_RANGES = {
    ecg: { min: 60, max: 100 },
    spo2: { min: 95, max: 100 },
    nibp: {
      systolic: { min: 100, max: 140 },
      diastolic: { min: 60, max: 90 }
    },
    temperature: { min: 36.5, max: 37.5 }
  };

  constructor() {
    this.socket$ = webSocket('wss://websocket.chhilif.com/ws');
    this.initializeWebSocket();
  }

  private initializeWebSocket(): void {
    this.socket$.subscribe({
      next: (data) => this.handleIncomingData(data),
      error: (error) => console.error('WebSocket error:', error),
      complete: () => console.log('WebSocket connection closed')
    });

    interval(1000).subscribe(() => {
      this.sendVitalSigns();
    });
  }

  private generateVitalSigns(): VitalSigns {
    let vitals: VitalSigns;
    
    switch (this.currentScenario) {
      case 'hyperthermia':
        vitals = {
          timestamp: Date.now(),
          ecg: this.generateValue(100, 130),      // Tachycardie
          spo2: this.generateValue(94, 96),       // SpO2 légèrement basse
          nibp: {
            systolic: this.generateValue(100, 110),
            diastolic: this.generateValue(60, 70)
          },
          temperature: this.generateValue(39.5, 41.0), // Température très élevée
          scenario: this.currentScenario
        };
        break;

      case 'hypothermia':
        vitals = {
          timestamp: Date.now(),
          ecg: this.generateValue(40, 50),        // Bradycardie
          spo2: this.generateValue(88, 92),       // SpO2 basse
          nibp: {
            systolic: this.generateValue(85, 95),
            diastolic: this.generateValue(50, 60)
          },
          temperature: this.generateValue(33.0, 35.0), // Température très basse
          scenario: this.currentScenario
        };
        break;

      case 'hemorrhagic':
        vitals = {
          timestamp: Date.now(),
          ecg: this.generateValue(120, 150),      // Tachycardie sévère
          spo2: this.generateValue(85, 90),       // SpO2 très basse
          nibp: {
            systolic: this.generateValue(60, 80),  // Hypotension
            diastolic: this.generateValue(40, 50)
          },
          temperature: this.generateValue(36.0, 36.5),
          scenario: this.currentScenario
        };
        break;

      case 'cardiac_arrest':
        vitals = {
          timestamp: Date.now(),
          ecg: this.generateValue(150, 200),      // Tachycardie très sévère
          spo2: this.generateValue(80, 85),       // SpO2 critique
          nibp: {
            systolic: this.generateValue(180, 220), // Hypertension sévère
            diastolic: this.generateValue(100, 120)
          },
          temperature: this.generateValue(36.5, 37.5),
          scenario: this.currentScenario
        };
        break;

      case 'asthma':
        vitals = {
          timestamp: Date.now(),
          ecg: this.generateValue(100, 120),      // Tachycardie modérée
          spo2: this.generateValue(85, 90),       // SpO2 très basse
          nibp: {
            systolic: this.generateValue(130, 150),
            diastolic: this.generateValue(80, 90)
          },
          temperature: this.generateValue(37.0, 37.5),
          scenario: this.currentScenario
        };
        break;

      case 'normal':
      default:
        vitals = {
          timestamp: Date.now(),
          ecg: this.generateValue(60, 100),
          spo2: this.generateValue(95, 100),
          nibp: {
            systolic: this.generateValue(110, 130),
            diastolic: this.generateValue(70, 85)
          },
          temperature: this.generateValue(36.5, 37.2),
          scenario: this.currentScenario
        };
    }

    // Envoyer au WebSocket
    this.socket$.next(vitals);

    return vitals;
  }

  private generateValue(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private sendVitalSigns(): void {
    const vitalSigns = this.generateVitalSigns();
    this.vitalSignsSubject.next(vitalSigns);
    this.updateHistory(vitalSigns);
  }

  private handleIncomingData(data: any): void {
    console.log('Received data:', data);
  }

  getVitalSigns(): Observable<VitalSigns | null> {
    return this.vitalSignsSubject.asObservable();
  }

  setScenario(scenario: ScenarioType): void {
    this.currentScenario = scenario;
  }

  injectAnomaly(parameter: keyof VitalSigns, value: number): void {
    const currentValue = this.vitalSignsSubject.value;
    if (currentValue) {
      const updatedValue = { ...currentValue, [parameter]: value };
      this.vitalSignsSubject.next(updatedValue);
    }
  }

  simulateHardwareFailure(): void {
    this.socket$.error(new Error('Hardware failure simulated'));
  }

  private updateHistory(vitalSigns: VitalSigns): void {
    const timestamp = Date.now();

    // Mise à jour ECG
    this.updateParameterHistory('ecg', timestamp, vitalSigns.ecg);
    this.updateParameterHistory('spo2', timestamp, vitalSigns.spo2);
    this.updateParameterHistory('nibp.systolic', timestamp, vitalSigns.nibp.systolic);
    this.updateParameterHistory('nibp.diastolic', timestamp, vitalSigns.nibp.diastolic);
    this.updateParameterHistory('temperature', timestamp, vitalSigns.temperature);
  }

  private updateParameterHistory(parameter: string, timestamp: number, value: number): void {
    const history = this.getHistoryForParameter(parameter);

    history.timestamps.push(timestamp);
    history.values.push(value);

    if (history.timestamps.length > this.MAX_HISTORY_POINTS) {
      history.timestamps.shift();
      history.values.shift();
    }
  }

  private getHistoryForParameter(parameter: string): VitalHistory {
    const parts = parameter.split('.');
    let history = this.vitalSignsHistory as any;
    for (const part of parts) {
      history = history[part];
    }
    return history;
  }

  getVitalSignsHistory(): VitalSignsHistory {
    return this.vitalSignsHistory;
  }
}

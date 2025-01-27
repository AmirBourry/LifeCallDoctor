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
}

export type ScenarioType = 'normal' | 'emergency' | 'recovery';

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
    const baseValues = this.getBaseValuesForScenario();

    return {
      timestamp: Date.now(),
      ecg: this.generateValue(baseValues.ecg, 5),
      spo2: this.generateValue(baseValues.spo2, 1),
      nibp: {
        systolic: this.generateValue(baseValues.nibp.systolic, 3),
        diastolic: this.generateValue(baseValues.nibp.diastolic, 2)
      },
      temperature: this.generateValue(baseValues.temperature, 0.1)
    };
  }

  private getBaseValuesForScenario() {
    switch (this.currentScenario) {
      case 'emergency':
        return {
          ecg: 120,
          spo2: 88,
          nibp: { systolic: 160, diastolic: 100 },
          temperature: 39.0
        };
      case 'recovery':
        return {
          ecg: 85,
          spo2: 97,
          nibp: { systolic: 125, diastolic: 80 },
          temperature: 37.2
        };
      default: // normal
        return {
          ecg: 75,
          spo2: 98,
          nibp: { systolic: 120, diastolic: 80 },
          temperature: 37.0
        };
    }
  }

  private generateValue(base: number, variance: number): number {
    return base + (Math.random() - 0.5) * variance;
  }

  private sendVitalSigns(): void {
    const vitalSigns = this.generateVitalSigns();
    this.socket$.next(vitalSigns);
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

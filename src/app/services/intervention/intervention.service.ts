import { Injectable } from '@angular/core';
import { Database, ref, onValue, set, push, DataSnapshot } from '@angular/fire/database';
import { Observable } from 'rxjs';

export interface Intervention {
  id: string;
  startTime: number;
  status: 'en_cours' | 'terminee';
  equipeId: string;
  currentVitals: {
    spo2: number;
    ecg: number;
    nibp: number;
    temperature: number;
    lastUpdate: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class InterventionService {
  constructor(private db: Database) {}

  getInterventions(): Observable<Intervention[]> {
    return new Observable(subscriber => {
      const interventionsRef = ref(this.db, 'interventions');
      onValue(interventionsRef, (snapshot: DataSnapshot) => {
        const data = snapshot.val();
        const interventions = data ? Object.values(data) : [];
        subscriber.next(interventions as Intervention[]);
      });
    });
  }

  async createIntervention(intervention: Omit<Intervention, 'id'>): Promise<string> {
    const interventionsRef = ref(this.db, 'interventions');
    const newInterventionRef = push(interventionsRef);
    await set(newInterventionRef, {
      ...intervention,
      id: newInterventionRef.key
    });
    return newInterventionRef.key as string;
  }

  getInterventionById(id: string): Observable<Intervention> {
    return new Observable(subscriber => {
      const interventionRef = ref(this.db, `interventions/${id}`);
      onValue(interventionRef, (snapshot) => {
        const data = snapshot.val();
        subscriber.next(data as Intervention);
      });
    });
  }
} 
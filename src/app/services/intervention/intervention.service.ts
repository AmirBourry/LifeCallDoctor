import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  query, 
  where, 
  Timestamp, 
  Query,
  getDocs,
  DocumentData,
  QueryDocumentSnapshot
} from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, take, tap, catchError } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

export interface VitalSigns {
  id?: string;
  spo2: number;
  ecg: number;
  nibp: number;
  temperature: number;
  timestamp: Timestamp;
}

export interface Personnel {
  id?: string;
  nom: string;
  prenom: string;
  role: 'medecin' | 'infirmier';
  specialite: string;
  isAvailable: boolean;
  lastActive: Timestamp;
}

export interface Patient {
  id?: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  numeroSecu: string;
  interventions: string[];
}

export interface Intervention {
  id?: string;
  startTime: Timestamp;
  endTime: Timestamp | null;
  status: 'en_cours' | 'terminee';
  equipeId: string;
  patientId: string;
  currentVitals: {
    timestamp: Timestamp;
    values: VitalSigns;
  };
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class InterventionService {
  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {}

  private convertFirestoreData<T>(doc: QueryDocumentSnapshot<DocumentData>): T {
    return { id: doc['id'], ...doc.data() } as T;
  }

  private getCollectionData<T>(collectionName: string): Observable<T[]> {
    console.log(`Fetching ${collectionName} data...`);
    return this.authService.user$.pipe(
      take(1),
      tap(user => console.log(`User state for ${collectionName}:`, user)),
      switchMap(user => {
        if (!user) {
          console.error(`User not authenticated for ${collectionName}`);
          return of([]);
        }
        
        const collectionRef = collection(this.firestore, collectionName);
        return from(getDocs(query(collectionRef))).pipe(
          tap(snapshot => console.log(`${collectionName} data received:`, snapshot.docs.length)),
          map(snapshot => snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as T))),
          catchError(error => {
            console.error(`Error fetching ${collectionName}:`, error);
            return of([]);
          })
        );
      })
    );
  }

  getInterventions(): Observable<Intervention[]> {
    return this.getCollectionData<Intervention>('interventions');
  }

  getPersonnel(): Observable<Personnel[]> {
    return this.getCollectionData<Personnel>('personnel');
  }

  getPatients(): Observable<Patient[]> {
    return this.getCollectionData<Patient>('patients');
  }

  getVitalSigns(interventionId: string): Observable<VitalSigns[]> {
    return this.authService.user$.pipe(
      take(1),
      switchMap(user => {
        if (!user) {
          console.error('User not authenticated');
          return of([]);
        }

        const vitalsRef = collection(this.firestore, 'vitalSigns');
        const vitalsQuery = query(vitalsRef);
        return from(getDocs(vitalsQuery)).pipe(
          map(snapshot => snapshot.docs.map(doc => this.convertFirestoreData<VitalSigns>(doc)))
        );
      })
    );
  }
} 
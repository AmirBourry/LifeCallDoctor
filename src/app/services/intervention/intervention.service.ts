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
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

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
    values: {
      spo2: number;
      ecg: number;
      nibp: number;
      temperature: number;
    }
  };
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class InterventionService {
  constructor(private firestore: Firestore) {}

  private convertFirestoreData<T>(doc: QueryDocumentSnapshot<DocumentData>): T {
    return { id: doc['id'], ...doc.data() } as T;
  }

  getInterventions(): Observable<Intervention[]> {
    const interventionsRef = collection(this.firestore, 'interventions');
    return from(getDocs(query(interventionsRef))).pipe(
      map(snapshot => snapshot.docs.map(doc => this.convertFirestoreData<Intervention>(doc)))
    );
  }

  getPersonnel(): Observable<Personnel[]> {
    const personnelRef = collection(this.firestore, 'personnel');
    return from(getDocs(query(personnelRef))).pipe(
      map(snapshot => snapshot.docs.map(doc => this.convertFirestoreData<Personnel>(doc)))
    );
  }

  getPatients(): Observable<Patient[]> {
    const patientsRef = collection(this.firestore, 'patients');
    return from(getDocs(query(patientsRef))).pipe(
      map(snapshot => snapshot.docs.map(doc => this.convertFirestoreData<Patient>(doc)))
    );
  }

  getVitalSigns(interventionId: string): Observable<VitalSigns[]> {
    const vitalsRef = collection(this.firestore, 'vitalSigns');
    const vitalsQuery = query(vitalsRef, where('interventionId', '==', interventionId));
    return from(getDocs(vitalsQuery)).pipe(
      map(snapshot => snapshot.docs.map(doc => this.convertFirestoreData<VitalSigns>(doc)))
    );
  }
} 
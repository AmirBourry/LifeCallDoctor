import { VitalSigns } from "../services/sensor/sensor-mock.service";

export interface CallReport {
  duration: number;
  startTime: number;
  endTime: number;
  transcription: string[];
  vitals: VitalSigns[];
  doctor: {
    nom: string;
    prenom: string;
    specialite?: string;
  };
  nurse: {
    nom: string;
    prenom: string;
  };
} 
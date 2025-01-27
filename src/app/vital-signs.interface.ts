export interface VitalSigns {
  timestamp: number;
  ecg: number;
  spo2: number;
  nibp: {
    systolic: number;
    diastolic: number;
  };
  temperature: number;
  scenario: string;
}

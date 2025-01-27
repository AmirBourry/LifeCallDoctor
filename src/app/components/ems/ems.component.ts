import { Component } from '@angular/core';
import {NgForOf} from '@angular/common';

interface VitalSign {
  icon: string;
  label: string;
  value: string;
}

@Component({
  selector: 'app-ems',
  templateUrl: './ems.component.html',
  standalone: true,
  imports: [
    NgForOf
  ],
  styleUrls: ['./ems.component.css']
})
export class EmsComponent {
  vitalSigns: VitalSign[] = [
    { icon: "❤️", label: "BPM", value: "95" },
    { icon: "🩺", label: "Tension", value: "95" },
    { icon: "🫀", label: "mmHg", value: "95" },
    { icon: "🫁", label: "Fréq. resp.", value: "95" },
    { icon: "💨", label: "SaO2", value: "95" },
    { icon: "🌡️", label: "Temp.", value: "95" }
  ];
}

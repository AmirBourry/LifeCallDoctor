import {Component, OnDestroy, OnInit} from '@angular/core';
import {DecimalPipe, NgForOf} from '@angular/common';
import { LayoutService } from '../../services/layout/layout.service';
import {CallInterfaceComponent} from "../calls/call-interface.component";
import {WebRTCTestComponent} from '../calls/test-webrtc.component';
import {VitalSignsService} from '../../services/vital-signs.service';
import {VitalSigns} from '../../vital-signs.interface';
import {Subscription} from 'rxjs';

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
    NgForOf,
    CallInterfaceComponent,
    WebRTCTestComponent,
    DecimalPipe
  ],
  styleUrls: ['./ems.component.css']
})
export class EmsComponent implements OnInit, OnDestroy  {

  private subscription: Subscription | undefined;
  vitalSigns: VitalSigns = {
    timestamp: 0,
    ecg: 0,
    spo2: 0,
    nibp: {
      systolic: 0,
      diastolic: 0
    },
    temperature: 0,
    scenario: ''
  };

  constructor(private readonly layoutService: LayoutService, private vitalSignsService: VitalSignsService) {
    this.layoutService.toggleSidebar(false);
  }

  public ngOnInit() {
    this.subscription = this.vitalSignsService.vitalSigns$.subscribe(
      (data: VitalSigns) => {
        this.vitalSigns = data;
      }
    );
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.vitalSignsService.disconnect();
  }
}

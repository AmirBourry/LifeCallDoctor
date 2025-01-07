import { Component } from '@angular/core';
import {MatTab, MatTabGroup, MatTabHeader} from '@angular/material/tabs';
import {FlexModule} from '@ngbracket/ngx-layout';
import {DatePipe} from '@angular/common';
import {MatCard} from '@angular/material/card';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {ReportComponent} from './report/report.component';
import {TakeinchargeComponent} from './takeincharge/takeincharge.component';
import {FollowingComponent} from './following/following.component';

@Component({
  selector: 'app-doctor',
  imports: [
    FlexModule,
    MatTabGroup,
    MatTab,
    MatTabHeader,
    MatSlideToggle,
    ReportComponent,
    TakeinchargeComponent,
    FollowingComponent
  ],
  templateUrl: './doctor.component.html',
  standalone: true,
  styleUrl: './doctor.component.css'
})
export class DoctorComponent {

}

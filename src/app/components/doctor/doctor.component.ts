import { Component, OnInit } from '@angular/core';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { FlexModule } from '@ngbracket/ngx-layout';
import { ReportComponent } from './report/report.component';
import { TakeinchargeComponent } from './takeincharge/takeincharge.component';
import { FollowingComponent } from './following/following.component';
import { InterventionService, Intervention } from '../../services/intervention/intervention.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-doctor',
  standalone: true,
  imports: [
    CommonModule,
    FlexModule,
    MatTabGroup,
    MatTab,
    ReportComponent,
    TakeinchargeComponent,
    FollowingComponent
  ],
  templateUrl: './doctor.component.html',
  styleUrls: ['./doctor.component.css']
})
export class DoctorComponent implements OnInit {
  interventions: Intervention[] = [];

  constructor(private interventionService: InterventionService) {}

  ngOnInit() {
    this.interventionService.getInterventions().subscribe(
      interventions => {
        this.interventions = interventions;
      }
    );
  }
}

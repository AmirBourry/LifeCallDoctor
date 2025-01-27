import { Component, OnInit } from '@angular/core';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { FlexModule } from '@ngbracket/ngx-layout';
import { ReportComponent } from './report/report.component';
import { TakeinchargeComponent } from './takeincharge/takeincharge.component';
import { FollowingComponent } from './following/following.component';
import { InterventionService, Intervention } from '../../services/intervention/intervention.service';
import { CommonModule } from '@angular/common';
import { Observable, tap } from 'rxjs';

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
  interventions$: Observable<Intervention[]>;

  constructor(private interventionService: InterventionService) {
    this.interventions$ = this.interventionService.getInterventions().pipe(
      tap(interventions => console.log('Interventions reçues:', interventions))
    );
  }

  ngOnInit() {
    // Pas besoin de s'abonner ici car nous utilisons le pipe async dans le template
  }
}

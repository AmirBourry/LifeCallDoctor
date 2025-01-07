import {Component, Input} from '@angular/core';
import {FlexModule} from '@ngbracket/ngx-layout';
import {MatIcon} from '@angular/material/icon';
import {MatMiniFabButton} from '@angular/material/button';

@Component({
  selector: 'app-call-item',
  imports: [
    FlexModule,
    MatIcon,
    MatMiniFabButton
  ],
  templateUrl: './call-item.component.html',
  standalone: true,
  styleUrl: './call-item.component.css'
})

export class CallItemComponent {
  @Input() call!: Call;
}

interface Call {
  priority: number;
  type: string;
  address: string;
  city: string;
  time: string;
}

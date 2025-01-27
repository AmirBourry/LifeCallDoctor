import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmsComponent } from './ems.component';

describe('EmsComponent', () => {
  let component: EmsComponent;
  let fixture: ComponentFixture<EmsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

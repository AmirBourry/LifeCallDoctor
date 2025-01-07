import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TakeinchargeComponent } from './takeincharge.component';

describe('TakeinchargeComponent', () => {
  let component: TakeinchargeComponent;
  let fixture: ComponentFixture<TakeinchargeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TakeinchargeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TakeinchargeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

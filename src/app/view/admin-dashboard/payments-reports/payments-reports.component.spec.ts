import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentsReportsComponent } from './payments-reports.component';

describe('PaymentsReportsComponent', () => {
  let component: PaymentsReportsComponent;
  let fixture: ComponentFixture<PaymentsReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentsReportsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentsReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

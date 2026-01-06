import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentsCommissionsComponent } from './payments-commissions.component';

describe('PaymentsCommissionsComponent', () => {
  let component: PaymentsCommissionsComponent;
  let fixture: ComponentFixture<PaymentsCommissionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentsCommissionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentsCommissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

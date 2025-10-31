import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentsCustomersComponent } from './payments-customers.component';

describe('PaymentsCustomersComponent', () => {
  let component: PaymentsCustomersComponent;
  let fixture: ComponentFixture<PaymentsCustomersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentsCustomersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentsCustomersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

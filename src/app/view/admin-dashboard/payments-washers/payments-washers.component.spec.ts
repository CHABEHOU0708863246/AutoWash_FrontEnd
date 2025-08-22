import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentsWashersComponent } from './payments-washers.component';

describe('PaymentsWashersComponent', () => {
  let component: PaymentsWashersComponent;
  let fixture: ComponentFixture<PaymentsWashersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentsWashersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentsWashersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

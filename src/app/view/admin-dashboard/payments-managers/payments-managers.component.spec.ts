import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentsManagersComponent } from './payments-managers.component';

describe('PaymentsManagersComponent', () => {
  let component: PaymentsManagersComponent;
  let fixture: ComponentFixture<PaymentsManagersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentsManagersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentsManagersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpensesProfitabilityComponent } from './expenses-profitability.component';

describe('ExpensesProfitabilityComponent', () => {
  let component: ExpensesProfitabilityComponent;
  let fixture: ComponentFixture<ExpensesProfitabilityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpensesProfitabilityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpensesProfitabilityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpensesRentComponent } from './expenses-rent.component';

describe('ExpensesRentComponent', () => {
  let component: ExpensesRentComponent;
  let fixture: ComponentFixture<ExpensesRentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpensesRentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpensesRentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

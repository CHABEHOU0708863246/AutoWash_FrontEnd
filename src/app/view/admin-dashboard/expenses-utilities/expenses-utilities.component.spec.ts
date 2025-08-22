import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpensesUtilitiesComponent } from './expenses-utilities.component';

describe('ExpensesUtilitiesComponent', () => {
  let component: ExpensesUtilitiesComponent;
  let fixture: ComponentFixture<ExpensesUtilitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpensesUtilitiesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpensesUtilitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

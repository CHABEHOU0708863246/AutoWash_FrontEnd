import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendanceTodayComponent } from './attendance-today.component';

describe('AttendanceTodayComponent', () => {
  let component: AttendanceTodayComponent;
  let fixture: ComponentFixture<AttendanceTodayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceTodayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttendanceTodayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsersAttendanceComponent } from './users-attendance.component';

describe('UsersAttendanceComponent', () => {
  let component: UsersAttendanceComponent;
  let fixture: ComponentFixture<UsersAttendanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersAttendanceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsersAttendanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

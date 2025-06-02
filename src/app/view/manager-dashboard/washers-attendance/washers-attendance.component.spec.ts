import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WashersAttendanceComponent } from './washers-attendance.component';

describe('WashersAttendanceComponent', () => {
  let component: WashersAttendanceComponent;
  let fixture: ComponentFixture<WashersAttendanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WashersAttendanceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WashersAttendanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

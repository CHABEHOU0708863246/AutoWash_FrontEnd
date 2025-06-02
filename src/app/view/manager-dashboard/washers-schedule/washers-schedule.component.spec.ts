import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WashersScheduleComponent } from './washers-schedule.component';

describe('WashersScheduleComponent', () => {
  let component: WashersScheduleComponent;
  let fixture: ComponentFixture<WashersScheduleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WashersScheduleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WashersScheduleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

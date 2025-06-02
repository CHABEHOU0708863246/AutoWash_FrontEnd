import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsScheduleComponent } from './settings-schedule.component';

describe('SettingsScheduleComponent', () => {
  let component: SettingsScheduleComponent;
  let fixture: ComponentFixture<SettingsScheduleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsScheduleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettingsScheduleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { ScheduleSettingsService } from './schedule-settings.service';

describe('ScheduleSettingsService', () => {
  let service: ScheduleSettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScheduleSettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

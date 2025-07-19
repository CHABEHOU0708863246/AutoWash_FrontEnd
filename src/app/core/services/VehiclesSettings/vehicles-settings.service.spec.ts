import { TestBed } from '@angular/core/testing';

import { VehiclesSettingsService } from './vehicles-settings.service';

describe('VehiclesSettingsService', () => {
  let service: VehiclesSettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VehiclesSettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

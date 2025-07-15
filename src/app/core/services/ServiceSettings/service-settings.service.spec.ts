import { TestBed } from '@angular/core/testing';

import { ServiceSettingsService } from './service-settings.service';

describe('ServiceSettingsService', () => {
  let service: ServiceSettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiceSettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

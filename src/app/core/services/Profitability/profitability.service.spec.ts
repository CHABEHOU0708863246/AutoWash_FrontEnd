import { TestBed } from '@angular/core/testing';

import { ProfitabilityService } from './profitability.service';

describe('ProfitabilityService', () => {
  let service: ProfitabilityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProfitabilityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

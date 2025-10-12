import { TestBed } from '@angular/core/testing';

import { AttendancesService } from './attendances.service';

describe('AttendancesService', () => {
  let service: AttendancesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttendancesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { WashsService } from './washs.service';

describe('WashsService', () => {
  let service: WashsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WashsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

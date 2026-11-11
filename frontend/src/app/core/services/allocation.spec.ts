import { TestBed } from '@angular/core/testing';
import { Allocation } from './allocation';

describe('Allocation', () => {
  let service: Allocation;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Allocation);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

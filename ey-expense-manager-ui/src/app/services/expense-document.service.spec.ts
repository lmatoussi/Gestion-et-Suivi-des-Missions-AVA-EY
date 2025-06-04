import { TestBed } from '@angular/core/testing';

import { ExpenseDocumentService } from './expense-document.service';

describe('ExpenseDocumentService', () => {
  let service: ExpenseDocumentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExpenseDocumentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

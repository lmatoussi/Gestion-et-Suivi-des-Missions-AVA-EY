import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseDocumentUploadComponent } from './expense-document-upload.component';

describe('ExpenseDocumentUploadComponent', () => {
  let component: ExpenseDocumentUploadComponent;
  let fixture: ComponentFixture<ExpenseDocumentUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseDocumentUploadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseDocumentUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

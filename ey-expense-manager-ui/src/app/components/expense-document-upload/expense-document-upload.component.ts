import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ExpenseDocumentService, ExpenseDocumentResult } from '../../services/expense-document.service';
import { MissionService } from '../../services/mission.service';
import { Mission } from '../../models/Mission';

@Component({
  selector: 'app-expense-document-upload',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './expense-document-upload.component.html',
  styleUrls: ['./expense-document-upload.component.scss']
})
export class ExpenseDocumentUploadComponent implements OnInit {
  uploadForm: FormGroup;
  expenseForm: FormGroup;
  selectedFile: File | null = null;
  documentData: ExpenseDocumentResult | null = null;
  mission: Mission | null = null;
  loading = false;
  submitting = false;
  error = '';
  success = '';
  missionId: number | null = null;
  currentDate = new Date('2025-04-28T15:21:56Z');

  constructor(
    private fb: FormBuilder,
    private expenseDocumentService: ExpenseDocumentService,
    private missionService: MissionService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.uploadForm = this.fb.group({
      file: [null, Validators.required]
    });

    this.expenseForm = this.fb.group({
      missionId: [0, Validators.required],
      description: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      currency: ['', Validators.required],
      convertedAmount: [0],
      expenseDate: [this.currentDate.toISOString().split('T')[0], Validators.required],
      category: [''],
      receiptUrl: [''],
      status: ['Draft'],
      createdBy: ['lmatoussi', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('missionId');
      if (id) {
        this.missionId = +id;
        this.loadMission(this.missionId);
      }
    });
  }

  loadMission(id: number): void {
    this.missionService.getMissionById(id).subscribe({
      next: (mission) => {
        this.mission = mission;
        this.expenseForm.patchValue({
          missionId: mission.id
        });
      },
      error: (err) => {
        this.error = `Failed to load mission: ${err.message}`;
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadForm.get('file')?.setValue(file);
    }
  }

  uploadDocument(): void {
    if (!this.selectedFile) {
      this.error = 'Please select a file to upload';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.expenseDocumentService.uploadDocument(this.selectedFile).subscribe({
      next: (result) => {
        this.documentData = result;
        this.populateFormWithDocumentData(result);
        this.loading = false;
        this.success = 'Document processed successfully!';
      },
      error: (err) => {
        this.loading = false;
        this.error = `Error processing document: ${err.error || err.message}`;
      }
    });
  }

  populateFormWithDocumentData(data: ExpenseDocumentResult): void {
    this.expenseForm.patchValue({
      missionId: data.missionId,
      description: data.description || '',
      amount: data.amount || 0,
      currency: data.currency || '',
      category: data.category || '',
      status: data.status || 'Draft'
    });

    // If the mission wasn't already loaded, load it now
    if (!this.mission) {
      this.loadMission(data.missionId);
    }
  }

  createExpense(): void {
    if (this.expenseForm.invalid) {
      this.error = 'Please fill in all required fields';
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';

    const formData = {
      ...this.expenseForm.value,
      documentFile: this.selectedFile
    };

    this.expenseDocumentService.createExpenseFromDocument(formData).subscribe({
      next: (response) => {
        this.submitting = false;
        this.success = 'Expense created successfully!';
        setTimeout(() => {
          // Redirect to the expense list for this mission
          if (this.missionId) {
            this.router.navigate(['/missions', this.missionId, 'expenses']);
          } else {
            this.router.navigate(['/expenses']);
          }
        }, 1500);
      },
      error: (err) => {
        this.submitting = false;
        this.error = `Error creating expense: ${err.error || err.message}`;
      }
    });
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString();
  }
}
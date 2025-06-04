import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Router, ActivatedRoute } from '@angular/router';
import { ExpenseService } from '../../services/expense.service';
import { MissionService } from '../../services/mission.service';
import { AuthService } from '../../services/auth.service';
import { ExpenseUpdate, Expense } from '../../models/expense.model';
import { User } from '../../models/user.model';
import { Mission } from '../../models/Mission';

@Component({
  selector: 'app-expense-edit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './expense-edit.component.html',
  styleUrls: ['./expense-edit.component.scss'],
})
export class ExpenseEditComponent implements OnInit {
  expenseForm: FormGroup;
  missions: Mission[] = [];
  categories = [
    'Travel',
    'Accommodation',
    'Meals',
    'Transportation',
    'Office Supplies',
    'Equipment',
    'Software',
    'Communication',
    'Training',
    'Consulting',
    'Other',
  ];
  statuses = ['Pending', 'Approved', 'Rejected', 'In Review'];
  currencies = ['TND', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'];
  submitting = false;
  loading = true;
  error = '';
  currentUser: User | null = null;
  expense: Expense | null = null;
  expenseId: number | null = null;
  returnToMissionExpenses = false;

  constructor(
    private formBuilder: FormBuilder,
    private expenseService: ExpenseService,
    private missionService: MissionService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.expenseForm = this.formBuilder.group({});
    this.initForm();
  }

  ngOnInit(): void {
    // Get missions for dropdown
    this.missionService.getMissions().subscribe({
      next: (missions) => {
        this.missions = missions;
      },
      error: (err) => {
        console.error('Error loading missions:', err);
        this.error = 'Failed to load missions';
      },
    });

    // Get current user from AuthService
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });

    // Get expense ID from route params
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      const missionId = params.get('missionId');

      if (id) {
        this.expenseId = +id;
        this.loadExpense(this.expenseId);
      } else {
        this.error = 'No expense ID provided';
        this.loading = false;
      }

      // Check if we're coming from a mission's expenses page
      if (missionId) {
        this.returnToMissionExpenses = true;
      }
    });
  }

  private initForm(): void {
    this.expenseForm = this.formBuilder.group({
      missionId: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      amount: [0, [Validators.required, Validators.min(0)]],
      currency: ['TND', [Validators.required, Validators.maxLength(10)]],
      convertedAmount: [0, [Validators.min(0)]],
      expenseDate: ['', Validators.required],
      category: ['', [Validators.maxLength(100)]],
      receiptUrl: ['', [Validators.pattern('^(https?:\\/\\/)?([\\da-z.-]+)\\.([a-z.]{2,6})([\\/\\w .-]*)*(\\?[\\da-z%&=.-]*)?(#[\\da-z-]*)?$')]],
      status: ['Pending', [Validators.required, Validators.maxLength(50)]],
      updatedBy: ['', [Validators.required, Validators.maxLength(100)]],
    });
  }

  loadExpense(id: number): void {
    this.loading = true;
    this.expenseService.getExpenseById(id).subscribe({
      next: (expense) => {
        this.expense = expense;
        this.patchFormValues(expense);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading expense:', err);
        this.error =
          'Failed to load expense details: ' +
          (err.error || err.message || 'Unknown error');
        this.loading = false;
      },
    });
  }

  patchFormValues(expense: Expense): void {
    // Format the date to YYYY-MM-DD for the input field
    const expenseDate = expense.expenseDate
      ? new Date(expense.expenseDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    this.expenseForm.patchValue({
      missionId: expense.missionId,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      convertedAmount: expense.convertedAmount,
      expenseDate: expenseDate,
      category: expense.category || '',
      receiptUrl: expense.receiptUrl || '',
      status: expense.status,
      updatedBy: this.currentUser?.surname || 'System',
    });
  }

  onCurrencyChange(): void {
    const currencyControl = this.expenseForm.get('currency');
    const amountControl = this.expenseForm.get('amount');
    const convertedAmountControl = this.expenseForm.get('convertedAmount');

    if (currencyControl && amountControl && convertedAmountControl) {
      // If currency is TND, set convertedAmount equal to amount
      if (currencyControl.value === 'TND') {
        convertedAmountControl.setValue(amountControl.value);
      }
      // Otherwise, you might want to implement an exchange rate API call here
    }
  }

  onSubmit(): void {
    if (this.expenseForm.invalid) {
      Object.keys(this.expenseForm.controls).forEach((key) => {
        const control = this.expenseForm.get(key);
        control?.markAsTouched();
      });
      console.log('Form is invalid:', this.expenseForm.errors);
      return;
    }

    if (!this.expenseId) {
      this.error = 'Expense ID is missing';
      return;
    }

    this.submitting = true;
    this.error = '';

    const formValues = this.expenseForm.value;

    const expenseData: ExpenseUpdate = {
      id: this.expenseId,
      missionId: Number(formValues.missionId),
      description: formValues.description,
      amount: Number(formValues.amount),
      currency: formValues.currency,
      convertedAmount: Number(formValues.convertedAmount),
      expenseDate: formValues.expenseDate,
      category: formValues.category,
      receiptUrl: formValues.receiptUrl,
      status: formValues.status,
      updatedBy: this.currentUser?.nameUser || this.currentUser?.surname || 'System',
    };

    console.log('Expense data to be updated:', expenseData);

    this.expenseService
    .updateExpense(this.expenseId, expenseData)
    .subscribe({
      next: () => {
        console.log('Expense updated successfully');
        // Navigate to the mission's expenses or expenses list
        if (this.returnToMissionExpenses) {
          this.router.navigate(['/missions', expenseData.missionId, 'expenses']);
        } else {
          this.router.navigate(['/expenses']);
        }
      },
        error: (err: any) => {
          console.error('Error updating expense:', err);
          if (err && err.error && typeof err.error === 'object') {
            const validationErrors = [];
            for (const key in err.error) {
              if (Object.prototype.hasOwnProperty.call(err.error, key)) {
                validationErrors.push(err.error[key]);
              }
            }
            this.error = validationErrors.join('. ');
          } else {
            this.error = 'Failed to update expense: ' + (err.error || err.message || 'Unknown error');
          }
          this.submitting = false;
        },
      });
  }
}

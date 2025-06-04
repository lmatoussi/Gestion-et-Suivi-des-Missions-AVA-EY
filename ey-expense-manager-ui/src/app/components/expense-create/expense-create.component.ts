import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Router, ActivatedRoute } from '@angular/router';
import { ExpenseService } from '../../services/expense.service';
import { MissionService } from '../../services/mission.service';
import { AuthService } from '../../services/auth.service';
import { ExpenseCreate } from '../../models/expense.model';
import { Role, User } from '../../models/user.model';
import { Mission } from '../../models/Mission';
import { UserService } from '../../services/user.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-expense-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule
  ],
  templateUrl: './expense-create.component.html',
  styleUrls: ['./expense-create.component.scss']
})
export class ExpenseCreateComponent implements OnInit {
  expenseForm: FormGroup;
  missions: Mission[] = [];
  categories = [
    'Travel', 'Accommodation', 'Meals', 'Transportation', 
    'Office Supplies', 'Equipment', 'Software', 'Communication',
    'Training', 'Consulting', 'Other'
  ];
  statuses = ['Pending', 'Approved', 'Rejected', 'In Review'];
  currencies = ['TND', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'];
  submitting = false;
  error = '';
  currentUser: User | null = null;
  missionId: number | null = null;
  associers: User[] = [];
  
  // New properties for form pagination
  formProgress = 0;
  formSections = [
    { name: 'Basic Info', icon: 'info', complete: false },
    { name: 'Financial', icon: 'attach_money', complete: false },
    { name: 'Details', icon: 'description', complete: false }
  ];
  currentSection = 0;
  animating = false;
  cardAnimationDuration = 300;

  constructor(
    private formBuilder: FormBuilder,
    private expenseService: ExpenseService,
    private missionService: MissionService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService // Inject UserService

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
      }
    });

    // Get current user from AuthService
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.expenseForm.patchValue({
        createdBy: this.currentUser?.surname || 'System'
      });
    });

    this.userService.getUsersByRole(Role.Associer).subscribe({
      next: (associers) => {
        this.associers = associers;
      },
      error: (err) => {
        console.error('Error loading associers:', err);
        this.error = 'Failed to load associers';
      }
    });

    // Check if missionId is provided in route params
    this.route.paramMap.subscribe(params => {
      const id = params.get('missionId');
      if (id) {
        this.missionId = +id;
        this.expenseForm.patchValue({
          missionId: this.missionId
        });
      }
    });

    // Track form changes to update progress
    this.expenseForm.valueChanges.subscribe(() => {
      this.updateFormProgress();
      this.updateSectionStatus();
    });
  }

  private initForm(): void {
    // Use FormBuilder to create the form with proper validations matching backend requirements
    this.expenseForm = this.formBuilder.group({
      missionId: ['', [Validators.required]],
      associerId: ['', [Validators.required]], // Add this linn
      description: ['', [Validators.required, Validators.maxLength(500)]],
      amount: [0, [Validators.required, Validators.min(0)]],
      currency: ['TND', [Validators.required, Validators.maxLength(10)]],
      convertedAmount: [0, [Validators.min(0)]],
      expenseDate: [new Date().toISOString().split('T')[0], Validators.required],
      category: ['', [Validators.maxLength(100)]],
      receiptUrl: ['', [Validators.pattern('^(https?:\\/\\/)?([\\da-z.-]+)\\.([a-z.]{2,6})([\\/\\w .-]*)*(\\?[\\da-z%&=.-]*)?(#[\\da-z-]*)?$')]],
      status: ['Pending', [Validators.required, Validators.maxLength(50)]],
      createdBy: ['System', [Validators.required, Validators.maxLength(100)]]
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

  // Calculate form completion progress
  updateFormProgress(): void {
    const requiredFields = [
      'missionId', 'description', 'amount', 'currency', 
      'expenseDate', 'status'
    ];

    const filledFields = requiredFields.filter(field => {
      const control = this.expenseForm.get(field);
      return control && control.valid && control.value !== '' && control.value !== null;
    });

    this.formProgress = Math.round((filledFields.length / requiredFields.length) * 100);
  }

  // Update status of form sections
  updateSectionStatus(): void {
    // Basic Info section
    const basicInfoFields = ['missionId', 'description', 'category'];
    const basicInfoComplete = basicInfoFields.every(field => {
      const control = this.expenseForm.get(field);
      return control && (!control.errors || 
        (control.errors && !control.errors['required'])) && 
        control.value !== null;
    });
    this.formSections[0].complete = basicInfoComplete;

    // Financial section
    const financialFields = ['amount', 'currency', 'convertedAmount'];
    const financialComplete = financialFields.every(field => {
      const control = this.expenseForm.get(field);
      return control && (!control.errors || 
        (control.errors && !control.errors['required'])) && 
        (field === 'currency' || control.value > 0);
    });
    this.formSections[1].complete = financialComplete;

    // Details section
    const detailsFields = ['expenseDate', 'status', 'receiptUrl'];
    const detailsComplete = detailsFields.every(field => {
      const control = this.expenseForm.get(field);
      return control && (!control.errors || 
        (control.errors && !control.errors['required']));
    });
    this.formSections[2].complete = detailsComplete;
  }

  // Navigate to next section
  nextSection(): void {
    if (this.currentSection < this.formSections.length - 1) {
      this.animating = true;
      setTimeout(() => {
        this.currentSection++;
        this.animating = false;
      }, 300);
    }
  }

  // Navigate to previous section
  prevSection(): void {
    if (this.currentSection > 0) {
      this.animating = true;
      setTimeout(() => {
        this.currentSection--;
        this.animating = false;
      }, 300);
    }
  }

  // Navigate to specific section
  goToSection(index: number): void {
    if (index !== this.currentSection) {
      this.animating = true;
      setTimeout(() => {
        this.currentSection = index;
        this.animating = false;
      }, 300);
    }
  }

  // Check for errors and return proper message
  getErrorMessage(fieldName: string): string | undefined {
    const control = this.expenseForm.get(fieldName);

    if (control?.hasError('required')) {
      return 'This field is required';
    }

    if (control?.hasError('maxlength')) {
      const maxLengthError = control.errors?.['maxlength'];
      return `Maximum length is ${maxLengthError.requiredLength} characters`;
    }

    if (control?.hasError('min')) {
      const minError = control.errors?.['min'];
      return `Minimum value is ${minError.min}`;
    }

    if (control?.hasError('pattern')) {
      return 'Please enter a valid URL';
    }

    return undefined;
  }

  // Helper method to check if a field is required
  isRequired(fieldName: string): boolean {
    const control = this.expenseForm.get(fieldName);
    if (control && control.validator) {
      const validator = control.validator({} as any);
      return validator && validator['required'];
    }
    return false;
  }

  // Helper method to check if a field has any error
  hasError(fieldName: string): boolean {
    const control = this.expenseForm.get(fieldName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  // Helper methods for summary card
  getMissionName(): string {
    const missionId = this.expenseForm.get('missionId')?.value;
    if (!missionId) return 'Not selected';
    
    const mission = this.missions.find(m => m.id === Number(missionId));
    return mission ? mission.nomDeContract : 'Not selected';
  }

  getCategory(): string {
    return this.expenseForm.get('category')?.value || 'Not specified';
  }

  getAmount(): string {
    const amount = this.expenseForm.get('amount')?.value;
    if (amount === null || amount === undefined) return '0.00';
    return amount.toFixed(2);
  }

  getCurrency(): string {
    return this.expenseForm.get('currency')?.value || 'TND';
  }

  getConvertedAmount(): string {
    const amount = this.expenseForm.get('convertedAmount')?.value;
    if (amount === null || amount === undefined) return '0.00';
    return amount.toFixed(2);
  }

  getExpenseDate(): string {
    const date = this.expenseForm.get('expenseDate')?.value;
    if (!date) return 'Not set';
    
    try {
      return new Date(date).toLocaleDateString();
    } catch (e) {
      return 'Invalid date';
    }
  }

  getStatus(): string {
    return this.expenseForm.get('status')?.value || 'Pending';
  }

  // Add this new method to get the Associer name
  getAssocierName(): string {
    const associerId = this.expenseForm.get('associerId')?.value;
    if (!associerId) return 'Not selected';
    
    const associer = this.associers.find(a => a.id === Number(associerId));
    return associer ? `${associer.nameUser} ${associer.surname}` : 'Not selected';
  }

  onSubmit(): void {
    if (this.expenseForm.invalid) {
      Object.keys(this.expenseForm.controls).forEach(key => {
        const control = this.expenseForm.get(key);
        control?.markAsTouched();
      });
      console.log('Form is invalid:', this.expenseForm.errors);
      return;
    }

    this.submitting = true;
    this.error = '';

    const formValues = this.expenseForm.value;

    const expenseData: ExpenseCreate = {
      ...formValues,
      missionId: Number(formValues.missionId),
      associerId: Number(formValues.associerId), // Add this line
      amount: Number(formValues.amount),
      convertedAmount: Number(formValues.convertedAmount),
      expenseDate: formValues.expenseDate, // date is already a string
      createdBy: this.currentUser?.nameUser || this.currentUser?.surname || 'System'
    };

    console.log('Expense data to be sent:', expenseData);

    this.expenseService.createExpense(expenseData).subscribe({
      next: (response) => {
        console.log('Expense created successfully:', response);
        // Navigate to the mission's expenses or expenses list
        if (this.missionId) {
          this.router.navigate(['/missions', this.missionId, 'expenses']);
        } else {
          this.router.navigate(['/expenses']);
        }
      },
      error: (err: any) => {
        console.error('Error creating expense:', err);
        if (err && err.error && typeof err.error === 'object') {
          const validationErrors = [];
          for (const key in err.error) {
            if (Object.prototype.hasOwnProperty.call(err.error, key)) {
              validationErrors.push(err.error[key]);
            }
          }
          this.error = validationErrors.join('. ');
        } else {
          this.error = 'Failed to create expense: ' + (err.error || err.message || 'Unknown error');
        }
        this.submitting = false;
      }
    });
  }
}
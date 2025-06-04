import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { MissionService } from '../../services/mission.service';
import { AuthService } from '../../services/auth.service';
import { CurrencyService } from '../../services/currency.service';
import { CountryService } from '../../services/country.service';
import { MissionCreate } from '../../models/Mission';
import { User } from '../../models/user.model';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-mission-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule
  ],
  templateUrl: './mission-create.component.html',
  styleUrls: ['./mission-create.component.scss']
})
export class MissionCreateComponent implements OnInit {

  associers: User[] = [];
  missionForm: FormGroup;
  submitting = false;
  error = '';
  currentUser: User | null = null;
  formProgress = 0; // Track form completion progress

  // New properties for currency and country
  countries: { name: string, currency: string }[] = [];
  exchangeRates: any = null;
  selectedCurrency = 'USD'; // Default currency
  conversionInProgress = false;
  AVA_PERCENTAGE = 0.15; // 15% for AVA calculation

  // Define form sections for stepped form
  formSections = [
    { name: 'Basic Info', icon: 'fa-info-circle', complete: false },
    { name: 'Financial', icon: 'fa-dollar-sign', complete: false },
    { name: 'Assignment', icon: 'fa-user-tie', complete: false }
  ];
  currentSection = 0;

  // Animation states
  animating = false;
  cardAnimationDuration = 300;
  activeCardClass = 'card-active';

  constructor(
    private formBuilder: FormBuilder,
    private missionService: MissionService,
    private authService: AuthService,
    private currencyService: CurrencyService,
    private countryService: CountryService,
    private router: Router,
    private userService: UserService,
  ) {
    this.missionForm = this.formBuilder.group({});
    this.initForm();
  }

  ngOnInit(): void {
    // Get current user from AuthService
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.loadAssociers();
      this.missionForm.patchValue({
        createdBy: this.currentUser?.surname || 'System'
      });
      
    });

    // Load countries data
    this.loadCountries();

    // Get initial exchange rates for default currency
    this.loadExchangeRates(this.selectedCurrency);

    // Add listener for country changes
    this.missionForm.get('pays')?.valueChanges.subscribe(country => {
      if (country) {
        this.updateCurrencyForCountry(country);
      }
    });


    // Add listener for foreign currency amount changes with debounce
    this.missionForm.get('montantDevise')?.valueChanges
      .pipe(
        debounceTime(300), // Wait for 300ms of inactivity
        distinctUntilChanged() // Only emit when the value changes
      )
      .subscribe(amount => {
        if (amount !== null && amount !== undefined && this.exchangeRates) {
          this.convertToTND(amount);
        }
      });

    // Add listener for TND amount changes to update AVA
    this.missionForm.get('montantTnd')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(amount => {
        if (amount !== null && amount !== undefined) {
          this.calculateAVA(amount);
        }
      });

    // Track form changes to update progress
    this.missionForm.valueChanges.subscribe(() => {
      this.updateFormProgress();
      this.updateSectionStatus();
    });
  }

  private initForm(): void {
    // Use FormBuilder to create the form with proper validations matching backend requirements
    this.missionForm = this.formBuilder.group({
      idMission: ['', [Validators.required, Validators.maxLength(50)]],
      nomDeContract: ['', [Validators.required, Validators.maxLength(100)]],
      client: ['', [Validators.required, Validators.maxLength(100)]],
      dateSignature: [new Date().toISOString().split('T')[0], Validators.required],
      engagementCode: ['', Validators.maxLength(50)],
      pays: ['', Validators.maxLength(50)],
      selectedCurrency: ['USD'], // Add currency field
      montantDevise: [0, [Validators.required, Validators.min(0)]],
      montantTnd: [{ value: 0, disabled: false }, [Validators.required, Validators.min(0)]],
      ava: [{ value: 0, disabled: false }, [Validators.required, Validators.min(0)]],
      associerId: [1],
      status: ['Pending', Validators.required],
      createdBy: ['System', [Validators.required, Validators.maxLength(100)]]
    });
  }

  // Load countries from CountryService
  loadCountries(): void {
    this.countryService.getCountries().subscribe({
      next: (countries) => {
        this.countries = countries.sort((a, b) => a.name.localeCompare(b.name));
      },
      error: (error) => {
        console.error('Error loading countries:', error);
        this.error = 'Failed to load countries data.';
      }
    });
  }

  
  loadAssociers(): void {
    this.userService.getAssociers().subscribe({
      next: (data) => {
        this.associers = data;
      },
      error: (err) => {
        console.error('Error loading associers:', err);
      }
    });
  }

  // Update currency when country changes
  updateCurrencyForCountry(countryName: string): void {
    const country = this.countries.find(c => c.name === countryName);
    if (country && country.currency) {
      this.selectedCurrency = country.currency;
      this.missionForm.patchValue({ selectedCurrency: country.currency });
      this.loadExchangeRates(country.currency);
    } else {
      // If currency not found for country, default to USD
      this.selectedCurrency = 'USD';
      this.missionForm.patchValue({ selectedCurrency: 'USD' });
      this.loadExchangeRates('USD');
    }
  }

  // Load exchange rates for a specific currency
  loadExchangeRates(baseCurrency: string): void {
    if (!baseCurrency) {
      baseCurrency = 'USD'; // Default to USD if no currency provided
    }
    
    this.conversionInProgress = true;
    this.error = ''; // Clear any previous errors
    
    this.currencyService.getExchangeRate(baseCurrency).subscribe({
      next: (data) => {
        console.log('Exchange rates received:', data);
        this.exchangeRates = data;
        this.conversionInProgress = false;

        // Update TND amount if foreign amount is already entered
        const currentAmount = this.missionForm.get('montantDevise')?.value;
        if (currentAmount) {
          this.convertToTND(currentAmount);
        }
      },
      error: (error) => {
        console.error('Error loading exchange rates:', error);
        this.conversionInProgress = false;
        
        // Don't show error to user, just log it
        console.warn('Using default exchange rates');
      }
    });
  }

  // Convert foreign currency amount to TND
  convertToTND(amount: number): void {
    if (!amount) {
      this.missionForm.patchValue({ montantTnd: 0 });
      this.calculateAVA(0);
      return;
    }

    let tndAmount = amount;
    
    if (this.exchangeRates && this.exchangeRates.rates) {
      // Access TND rate using bracket notation to avoid TypeScript errors
      const tndRate = this.exchangeRates.rates['TND'];
      
      if (tndRate) {
        tndAmount = amount * tndRate;
      } else {
        // Fallback conversion if TND rate not found
        // Use approximate rates based on common currencies
        switch (this.selectedCurrency) {
          case 'USD': tndAmount = amount * 3; break;
          case 'EUR': tndAmount = amount * 3.3; break;
          case 'GBP': tndAmount = amount * 3.8; break;
          default: tndAmount = amount * 3; // Default fallback
        }
      }
    }

    // Update form with converted amount (rounded to 2 decimal places)
    this.missionForm.patchValue({
      montantTnd: parseFloat(tndAmount.toFixed(2))
    });

    // Calculate AVA based on the TND amount
    this.calculateAVA(tndAmount);
  }

  // Calculate AVA based on TND amount (15%)
  calculateAVA(tndAmount: number): void {
    if (!tndAmount) {
      this.missionForm.patchValue({ ava: 0 });
      return;
    }

    const avaAmount = tndAmount * this.AVA_PERCENTAGE;
    this.missionForm.patchValue({
      ava: parseFloat(avaAmount.toFixed(2))
    });
  }

  // Handle manual TND amount change
  onTndAmountChange(event: any): void {
    const tndAmount = parseFloat(event.target.value);
    if (!isNaN(tndAmount)) {
      this.calculateAVA(tndAmount);
    }
  }

  // Handle currency selection change
  onCurrencyChange(currency: string): void {
    if (!currency) {
      currency = 'USD'; // Default to USD
    }

    this.selectedCurrency = currency;
    this.loadExchangeRates(currency);
  }

  // Calculate form completion progress
  updateFormProgress(): void {
    const requiredFields = [
      'idMission', 'nomDeContract', 'client', 'dateSignature',
      'montantDevise', 'montantTnd', 'ava', 'status'
    ];

    const filledFields = requiredFields.filter(field => {
      const control = this.missionForm.get(field);
      return control && control.valid && control.value !== '' && control.value !== null;
    });

    this.formProgress = Math.round((filledFields.length / requiredFields.length) * 100);
  }

  // Update status of form sections
  updateSectionStatus(): void {
    // Basic Info section
    const basicInfoFields = ['idMission', 'nomDeContract', 'client', 'dateSignature', 'engagementCode'];
    const basicInfoComplete = basicInfoFields.every(field => {
      const control = this.missionForm.get(field);
      return control && (!control.errors ||
        (control.errors && !control.errors['required'])) && // Modified here
        control.value !== null;
    });
    this.formSections[0].complete = basicInfoComplete;

    // Financial section
    const financialFields = ['pays', 'montantDevise', 'montantTnd', 'ava'];
    const financialComplete = financialFields.every(field => {
      const control = this.missionForm.get(field);
      return control && (!control.errors ||
        (control.errors && !control.errors['required'])) && // Modified here
        (field === 'pays' || control.value > 0);
    });
    this.formSections[1].complete = financialComplete;

    // Assignment section
    const assignmentFields = ['status'];
    const assignmentComplete = assignmentFields.every(field => {
      const control = this.missionForm.get(field);
      return control && control.valid && control.value !== '';
    });
    this.formSections[2].complete = assignmentComplete;
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

  onSubmit(): void {
    if (this.missionForm.invalid) {
      Object.keys(this.missionForm.controls).forEach(key => {
        const control = this.missionForm.get(key);
        control?.markAsTouched();
      });
      console.log('Form is invalid:', this.missionForm.errors);
      this.error = 'Please correct errors in the form before submitting.';
      return;
    }

    this.submitting = true;
    this.error = '';

    const formValues = this.missionForm.value;

    const dateSignatureValue = formValues.dateSignature;
    const formattedDate = new Date(dateSignatureValue).toISOString();

    const missionData: MissionCreate = {
      ...formValues,
      dateSignature: formattedDate, // Send as ISO string
      associerId: formValues.associerId ? Number(formValues.associerId) : null,
      montantDevise: Number(formValues.montantDevise),
      montantTnd: Number(formValues.montantTnd),
      ava: Number(formValues.ava),
      createdBy: this.currentUser?.nameUser || this.currentUser?.surname || 'System'
    };

    // Remove selectedCurrency field as it's not part of the backend model
    delete missionData.selectedCurrency;

    console.log('Mission data to be sent:', missionData);

    this.missionService.createMission(missionData).subscribe({
      next: (response) => {
        console.log('Mission created successfully:', response);
        this.router.navigate(['/missions']);
      },
      error: (err: any) => {
        console.error('Error creating mission:', err);
        console.error('Error status:', err.status);
        console.error('Error details:', err.error);

        this.submitting = false;

        if (err && err.error) {
          // Handle different error response formats
          if (Array.isArray(err.error)) {
            // Handle array of errors
            const validationErrors: string[] = [];

            err.error.forEach((errorItem: any) => {
              if (typeof errorItem === 'string') {
                validationErrors.push(errorItem);

                if (errorItem.toLowerCase().includes('idmission')) {
                  this.missionForm.get('idMission')?.setErrors({ serverError: errorItem });
                }
              } else if (errorItem && typeof errorItem === 'object') {
                const errorMessage = errorItem.errorMessage || JSON.stringify(errorItem);
                validationErrors.push(errorMessage);

                // Attempt to map the error to specific form fields.
                if (errorItem.propertyName && this.missionForm.get(this.camelCase(errorItem.propertyName))) {
                  this.missionForm.get(this.camelCase(errorItem.propertyName))?.setErrors({ serverError: errorItem.errorMessage });
                }
              }
            });

            this.error = validationErrors.join('. ');
          } else if (typeof err.error === 'object') {
            // Handle object with validation errors
            const validationErrors: string[] = [];

            Object.keys(err.error).forEach(key => {
              if (err.error[key]) {
                validationErrors.push(err.error[key]);

                const fieldName = key.toLowerCase();

                Object.keys(this.missionForm.controls).forEach(controlName => {
                  if (controlName.toLowerCase() === fieldName) {
                    this.missionForm.get(controlName)?.setErrors({
                      serverError: err.error[key]
                    });
                  }
                });
              }
            });

            this.error = validationErrors.join('. ');
          } else if (typeof err.error === 'string') {
            // Handle string error
            this.error = err.error;
          } else {
            this.error = 'An error occurred while creating the mission.';
          }
        } else {
          this.error = 'Failed to connect to server. Please try again.';
        }
      }
    });
  }

  camelCase(str: string): string {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
      if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
      return index == 0 ? match.toLowerCase() : match.toUpperCase();
    });
  }

  // Check for errors and return proper message
  getErrorMessage(fieldName: string): string | undefined {
    const control = this.missionForm.get(fieldName);

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

    if (control?.hasError('serverError')) {
      return control.errors?.['serverError'];
    }

    return undefined;
  }

  // Helper method to check if a field is required
  isRequired(fieldName: string): boolean {
    const control = this.missionForm.get(fieldName);
    if (control && control.validator) {
      const validator = control.validator({} as any);
      return validator && validator['required'];
    }
    return false;
  }

  // Helper method to check if a field has any error
  hasError(fieldName: string): boolean {
    const control = this.missionForm.get(fieldName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  // TrackBy function for performance optimization
  trackByFn(index: number, item: any): any {
    return index;
  }
}

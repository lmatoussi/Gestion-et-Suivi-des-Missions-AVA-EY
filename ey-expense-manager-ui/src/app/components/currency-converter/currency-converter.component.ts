import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { DashboardService } from '../../services/dashboard.service';
import { CurrencyRate, CurrencyConversionResult } from '../../models/dashboard.model';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-currency-converter',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatDividerModule,
    MatProgressBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './currency-converter.component.html',
  styleUrls: ['./currency-converter.component.scss']
})
export class CurrencyConverterComponent implements OnInit, OnDestroy {
  converterForm: FormGroup;
  currencies: CurrencyRate[] = [];
  conversionResult: CurrencyConversionResult | null = null;
  isLoading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private dashboardService: DashboardService,
    private fb: FormBuilder
  ) {
    this.converterForm = this.fb.group({
      amount: [1000, [Validators.required, Validators.min(0.01)]],
      fromCurrency: ['TND', Validators.required],
      toCurrency: ['EUR', Validators.required]
    });
  }

  ngOnInit(): void {
    // Set initial loading state
    this.isLoading = true;

    // Load currencies
    this.dashboardService.currencyRates$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: rates => {
          this.currencies = rates;
          this.isLoading = false;

          if (rates.length > 0 && !this.conversionResult) {
            this.performConversion();
          }
        },
        error: err => {
          this.errorMessage = 'Unable to load currency rates.';
          this.isLoading = false;
          console.error('Error loading currency rates:', err);
        }
      });

    // Listen for form changes and convert automatically
    this.converterForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300)
      )
      .subscribe(() => {
        if (this.converterForm.valid) {
          this.performConversion();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  performConversion(): void {
    if (this.converterForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    const val = this.converterForm.value;

    this.dashboardService.convertCurrency(
      val.amount,
      val.fromCurrency,
      val.toCurrency
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (result) => {
        this.conversionResult = result;
        this.isLoading = false;

        // Check if we got a valid result (API might return 0 in case of error)
        if (result.rate === 0 && result.toAmount === 0) {
          this.errorMessage = 'Unable to perform conversion. Using estimated rates.';
        }
      },
      error: (err) => {
        console.error('Conversion error:', err);
        this.errorMessage = 'Conversion failed. Please try again.';
        this.isLoading = false;
      }
    });
  }

  swapCurrencies(): void {
    const fromCurrency = this.converterForm.get('fromCurrency')?.value;
    const toCurrency = this.converterForm.get('toCurrency')?.value;

    this.converterForm.patchValue({
      fromCurrency: toCurrency,
      toCurrency: fromCurrency
    });
  }

  refreshRates(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.dashboardService.fetchCurrencyRates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.performConversion();
        },
        error: (error) => {
          this.errorMessage = 'Unable to refresh rates. Using cached or estimated rates.';
          this.isLoading = false;
          console.error('Error refreshing rates:', error);
        }
      });
  }

  formatNumber(value: number): string {
    return value.toLocaleString(undefined, { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}

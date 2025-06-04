import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';

interface ExchangeRateResponse {
  base_code?: string;
  time_last_update_utc?: string;
  rates: Record<string, number>;
}

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  // Using a free API endpoint that doesn't require API key
  private apiUrl = 'https://open.er-api.com/v6/latest';
  
  constructor(private http: HttpClient) {}
  
  getExchangeRate(baseCurrency: string): Observable<ExchangeRateResponse> {
    if (!baseCurrency) {
      return throwError(() => new Error('Currency code is required'));
    }
    
    return this.http.get<ExchangeRateResponse>(`${this.apiUrl}/${baseCurrency}`).pipe(
      retry(2),
      catchError(error => {
        console.warn('Exchange rate API error:', error);
        // Return a simplified response with default rates
        return of({
          rates: this.getDefaultRates(baseCurrency)
        });
      })
    );
  }

  // Provide some default exchange rates as fallback
  private getDefaultRates(baseCurrency: string): Record<string, number> {
    // Default conversion rates for common currencies to TND
    switch (baseCurrency) {
      case 'USD':
        return { 'TND': 3.1, 'EUR': 0.91, 'GBP': 0.78 };
      case 'EUR':
        return { 'TND': 3.4, 'USD': 1.09, 'GBP': 0.86 };
      case 'GBP':
        return { 'TND': 3.95, 'USD': 1.27, 'EUR': 1.16 };
      default:
        return { 'TND': 3.0, 'USD': 1.0, 'EUR': 0.9 };
    }
  }
}
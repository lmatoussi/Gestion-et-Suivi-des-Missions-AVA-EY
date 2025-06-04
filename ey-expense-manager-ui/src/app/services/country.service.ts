import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, retry } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CountryService {
  private countriesUrl = 'https://restcountries.com/v3.1/all';
  
  // Fallback data in case API fails
  private fallbackCountries = [
    { name: 'United States', currency: 'USD' },
    { name: 'France', currency: 'EUR' },
    { name: 'Germany', currency: 'EUR' },
    { name: 'United Kingdom', currency: 'GBP' },
    { name: 'Tunisia', currency: 'TND' },
    { name: 'Canada', currency: 'CAD' },
    { name: 'Australia', currency: 'AUD' },
    { name: 'Japan', currency: 'JPY' },
    { name: 'China', currency: 'CNY' },
    { name: 'India', currency: 'INR' },
  ];
  
  constructor(private http: HttpClient) {}
  
  getCountries(): Observable<any[]> {
    return this.http.get<any[]>(this.countriesUrl).pipe(
      retry(2),
      map(countries => countries
        .filter(country => country.name && country.currencies)
        .map(country => ({
          name: country.name.common,
          currency: country.currencies ? Object.keys(country.currencies)[0] : ''
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      ),
      catchError(error => {
        console.warn('Country API error, using fallback countries:', error);
        return of(this.fallbackCountries);
      })
    );
  }
}
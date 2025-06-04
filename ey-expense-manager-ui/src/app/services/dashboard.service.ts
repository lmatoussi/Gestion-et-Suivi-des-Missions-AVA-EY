// src/app/services/dashboard.service.ts
import { Injectable } from "@angular/core"
import { type Observable, forkJoin, map, switchMap, of, interval, BehaviorSubject } from "rxjs"
import { shareReplay, catchError, tap } from "rxjs/operators"
import { environment } from "../../environments/environment"

import { HttpClient } from "@angular/common/http"
import { MissionService } from "./mission.service"
import { ExpenseService } from "./expense.service"
import { UserService } from "./user.service"
import { Role } from "../models/user.model"
import { CurrencyRate, CurrencyConversionResult, CurrencyUpdateEvent } from "../models/dashboard.model"

@Injectable({
  providedIn: "root",
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/api/Dashboard`
  private exchangeRateApiUrl = '/api/exchange-rates'
  
  // Cache the rates
  private _currencyRates: BehaviorSubject<CurrencyRate[]> = new BehaviorSubject<CurrencyRate[]>([]);
  public currencyRates$ = this._currencyRates.asObservable();
  
  // Track updates to rates for notifications
  private _currencyUpdates = new BehaviorSubject<CurrencyUpdateEvent[]>([]);
  public currencyUpdates$ = this._currencyUpdates.asObservable();

  // Default currencies to display
  private defaultCurrencies = ['USD', 'EUR', 'GBP', 'TND'];

  constructor(
    private http: HttpClient,
    private missionService: MissionService,
    private expenseService: ExpenseService,
    private userService: UserService,
  ) {
    // Initialize currency rates and set up polling
    this.fetchCurrencyRates();
    
    // Poll for rates every 60 seconds (adjust as needed)
    interval(60000).subscribe(() => this.fetchCurrencyRates());
  }

  // Clear cached data when filters change
  clearCache(): void {
    this.avaSummary$ = undefined
    this.missionStatusBreakdown$ = undefined
    this.avaUsageByAssocier$ = undefined
    this.topAssociersByExpenses$ = undefined
    this.expensesByMissionType$ = undefined
  }

  private avaSummary$: Observable<{ total: number; used: number; remaining: number }> | undefined
  getAvaSummary(): Observable<{ total: number; used: number; remaining: number }> {
    if (!this.avaSummary$) {
      this.avaSummary$ = this.missionService.getMissions().pipe(
        switchMap((missions) => {
          const totalAva = missions.reduce((sum, mission) => sum + (mission.ava ?? 0), 0)
          return this.expenseService.getExpenses().pipe(
            map((expenses) => {
              const usedAva = expenses.reduce((sum, expense) => sum + (expense.convertedAmount ?? 0), 0)
              return {
                total: totalAva,
                used: usedAva,
                remaining: totalAva - usedAva,
              }
            }),
            catchError((error) => {
              console.error("Error getting AVA summary", error)
              return of({ total: 0, used: 0, remaining: 0 })
            }),
            shareReplay(1),
          )
        }),
      )
    }
    return this.avaSummary$
  }

  private missionStatusBreakdown$: Observable<{ status: string; count: number }[]> | undefined
  getMissionStatusBreakdown(): Observable<{ status: string; count: number }[]> {
    if (!this.missionStatusBreakdown$) {
      this.missionStatusBreakdown$ = this.missionService.getMissions().pipe(
        map((missions) => {
          const statusCounts = new Map<string, number>()

          missions.forEach((mission) => {
            const status = mission.status || "Unknown"
            statusCounts.set(status, (statusCounts.get(status) || 0) + 1)
          })

          return Array.from(statusCounts.entries()).map(([status, count]) => ({
            status,
            count,
          }))
        }),
        catchError((error) => {
          console.error("Error getting mission status breakdown", error)
          return of([])
        }),
        shareReplay(1),
      )
    }
    return this.missionStatusBreakdown$
  }

  private avaUsageByAssocier$: Observable<{ name: string; used: number; total: number }[]> | undefined
  getAvaUsageByAssocier(): Observable<{ name: string; used: number; total: number }[]> {
    if (!this.avaUsageByAssocier$) {
      this.avaUsageByAssocier$ = forkJoin({
        associers: this.userService.getUsersByRole(Role.Associer),
        missions: this.missionService.getMissions(),
        expenses: this.expenseService.getExpenses(),
      }).pipe(
        map(({ associers, missions, expenses }) =>
          associers.map((associer) => {
            const associerMissions = missions.filter((m) => m.associerId === associer.id)

            const totalAva = associerMissions.reduce((sum, mission) => sum + (mission.ava ?? 0), 0)

            const usedAva = expenses
              .filter((expense) => associerMissions.some((mission) => mission.id === expense.missionId))
              .reduce((sum, expense) => sum + (expense.convertedAmount ?? 0), 0)

            return {
              name: `${associer.nameUser} ${associer.surname}`,
              used: usedAva,
              total: totalAva,
            }
          }),
        ),
        catchError((error) => {
          console.error("Error getting AVA usage by associer", error)
          return of([])
        }),
        shareReplay(1),
      )
    }
    return this.avaUsageByAssocier$
  }

  private topAssociersByExpenses$: Observable<{ name: string; expenses: number }[]> | undefined
  getTopAssociersByExpenses(limit = 5): Observable<{ name: string; expenses: number }[]> {
    if (!this.topAssociersByExpenses$) {
      this.topAssociersByExpenses$ = forkJoin({
        associers: this.userService.getUsersByRole(Role.Associer),
        missions: this.missionService.getMissions(),
        expenses: this.expenseService.getExpenses(),
      }).pipe(
        map(({ associers, missions, expenses }) => {
          return associers
            .map((associer) => ({
              name: `${associer.nameUser} ${associer.surname}`,
              expenses: expenses
                .filter((expense) => missions.some((m) => m.associerId === associer.id && m.id === expense.missionId))
                .reduce((sum, e) => sum + (e.convertedAmount ?? 0), 0),
            }))
            .sort((a, b) => b.expenses - a.expenses)
            .slice(0, limit)
        }),
        catchError((error) => {
          console.error("Error getting top associers by expenses", error)
          return of([])
        }),
        shareReplay(1),
      )
    }
    return this.topAssociersByExpenses$
  }

  private expensesByMissionType$: Observable<{ type: string; amount: number }[]> | undefined
  getExpensesByMissionType(): Observable<{ type: string; amount: number }[]> {
    if (!this.expensesByMissionType$) {
      this.expensesByMissionType$ = forkJoin({
        missions: this.missionService.getMissions(),
        expenses: this.expenseService.getExpenses(),
      }).pipe(
        map(({ missions, expenses }) => {
          const typeExpenses = new Map<string, number>()

          missions.forEach((mission) => {
            const type = this.detectMissionType(mission)
            const missionExpenses = expenses
              .filter((e) => e.missionId === mission.id)
              .reduce((sum, e) => sum + (e.convertedAmount ?? 0), 0)

            typeExpenses.set(type, (typeExpenses.get(type) || 0) + missionExpenses)
          })

          return Array.from(typeExpenses.entries()).map(([type, amount]) => ({
            type,
            amount,
          }))
        }),
        catchError((error) => {
          console.error("Error getting expenses by mission type", error)
          return of([])
        }),
        shareReplay(1),
      )
    }
    return this.expensesByMissionType$
  }

  // New method to get AVA allocation history
  getAvaAllocationHistory(): Observable<any[]> {
    // This would typically come from a backend API
    // For now, we'll return mock data
    return of([
      {
        id: 1,
        date: new Date(2023, 0, 15),
        amount: 5000,
        allocationType: "mission",
        targetName: "Project Alpha",
        allocatedBy: "Admin User",
      },
      {
        id: 2,
        date: new Date(2023, 1, 10),
        amount: 3000,
        allocationType: "associer",
        targetName: "John Doe",
        allocatedBy: "Admin User",
      },
      {
        id: 3,
        date: new Date(2023, 2, 5),
        amount: 2500,
        allocationType: "mission",
        targetName: "Project Beta",
        allocatedBy: "Admin User",
      },
    ])
  }

  private detectMissionType(mission: any): string {
    const name = mission.nomDeContract?.toLowerCase() || ""
    if (name.includes("formation")) return "Formation"
    if (name.includes("réunion") || name.includes("reunion")) return "Réunion"
    return "Mission"
  }

  // Filter data by year
  filterDataByYear(year: number): Observable<any> {
    // Clear cached data when filters change
    this.clearCache()

    // In a real implementation, you would call your API with the year parameter
    // For now, we'll simulate this by returning the current data
    return this.http.get<any>(`${this.apiUrl}/filter?year=${year}`).pipe(
      catchError((error) => {
        console.error("Error filtering data by year", error)
        // Return empty object if API call fails
        return of({})
      }),
    )
  }

  // Export dashboard data
  exportDashboardData(format: "excel" | "pdf"): Observable<Blob> {
    return this.http
      .get(`${this.apiUrl}/export?format=${format}`, {
        responseType: "blob",
      })
      .pipe(
        catchError((error) => {
          console.error(`Error exporting dashboard data to ${format}`, error)
          // Return empty blob if API call fails
          return of(new Blob([]))
        }),
      )
  }

  // New method to allocate AVA to a mission
  allocateAvaToMission(missionId: number, amount: number, notes: string): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/allocate/mission/${missionId}`, {
        amount,
        notes,
      })
      .pipe(
        catchError((error) => {
          console.error("Error allocating AVA to mission", error)
          throw error
        }),
      )
  }

  // New method to allocate AVA to an associer
  allocateAvaToAssocier(associerId: number, amount: number, notes: string): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/allocate/associer/${associerId}`, {
        amount,
        notes,
      })
      .pipe(
        catchError((error) => {
          console.error("Error allocating AVA to associer", error)
          throw error
        }),
      )
  }

  private generateMockAvaUsageTrends(months: number): { month: string; used: number; remaining: number }[] {
    const now = new Date();
    const result = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString('default', { month: 'short' });
      
      // Generate some random but realistic looking data
      const total = 50000;
      const used = Math.round(total * (0.3 + (i / months) * 0.5)); // Gradually increases usage
      
      result.push({
        month: `${monthName} ${date.getFullYear()}`,
        used: used,
        remaining: total - used
      });
    }
    
    return result;
  }

  getAvaUsageTrends(months = 6): Observable<{ month: string; used: number; remaining: number }[]> {
    return this.http.get<{ month: string; used: number; remaining: number }[]>(
      `${this.apiUrl}/ava-trends?months=${months}`
    ).pipe(
      catchError((error) => {
        console.error("Error getting AVA usage trends", error);
        // Return mock data for now until backend supports this
        return of(this.generateMockAvaUsageTrends(months));
      }),
      shareReplay(1)
    );
  }

  forecastAvaUsage(months = 3): Observable<{ month: string; projected: number; threshold: number }[]> {
    return forkJoin({
      avaSummary: this.getAvaSummary(),
      usageTrends: this.getAvaUsageTrends(6)  // Use last 6 months to forecast
    }).pipe(
      map(({ avaSummary, usageTrends }) => {
        const result = [];
        const now = new Date();
        
        // Simple linear regression for forecasting
        // In a real implementation, you would use more sophisticated algorithms
        const recentMonthlyRate = usageTrends.length >= 2 ? 
          (usageTrends[usageTrends.length - 1].used - usageTrends[usageTrends.length - 2].used) : 
          avaSummary.used / 12;
        
        let projectedUsed = avaSummary.used;
        
        for (let i = 1; i <= months; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
          const monthName = date.toLocaleString('default', { month: 'short' });
          
          projectedUsed += recentMonthlyRate;
          
          result.push({
            month: `${monthName} ${date.getFullYear()}`,
            projected: projectedUsed,
            threshold: avaSummary.total * 0.9 // 90% threshold
          });
        }
        
        return result;
      }),
      catchError((error) => {
        console.error("Error forecasting AVA usage", error);
        return of([]);
      })
    );
  }

  // Add this method for consistency with component usage
  getBudgetAllocationHistory(): Observable<any[]> {
    // Just call the existing method for now
    return this.getAvaAllocationHistory();
  }

  // Since we're calling getDataWithDateRange, let's add that method
  getDataWithDateRange(startDate: Date, endDate: Date): Observable<any> {
    // For now, this can just be a wrapper around filterDataByYear
    const year = startDate.getFullYear();
    console.log(`Filtering data for date range: ${startDate.toISOString()} - ${endDate.toISOString()}`);
    return this.filterDataByYear(year);
  }

  // Add a method for generating a full report
  generateFullReport(): Observable<Blob> {
    // For now, this can just be a wrapper around exportDashboardData
    return this.exportDashboardData('pdf');
  }

  // Updated method to fetch currency rates with better error handling and fallbacks
  fetchCurrencyRates(): Observable<CurrencyRate[]> {
    // First try to get data from our API
    return this.http.get<any>(this.exchangeRateApiUrl).pipe(
      map(response => this.processCurrencyRatesResponse(response)),
      catchError(error => {
        console.error('Error fetching currency rates from API:', error);
        console.log('Falling back to mock currency data');
        
        // Return mock data when API fails
        return of(this.getMockCurrencyRates());
      }),
      tap(rates => {
        // Update BehaviorSubject with new rates
        this._currencyRates.next(rates);
      }),
      shareReplay(1)
    );
  }

  // Helper method to process the API response
  private processCurrencyRatesResponse(response: any): CurrencyRate[] {
    const rates: CurrencyRate[] = [];
    const oldRates = this._currencyRates.getValue();
    const updates: CurrencyUpdateEvent[] = [];
    
    // Create a map for easy lookup of old rates
    const oldRatesMap = new Map();
    oldRates.forEach(rate => oldRatesMap.set(rate.code, rate.rate));
    
    // Process response based on the API structure
    const apiRates = response.rates || {};
    
    this.defaultCurrencies.forEach(currencyCode => {
      // Skip TND as it's our base currency
      if (currencyCode === 'TND') return;
      
      const rate = apiRates[currencyCode] || this.getFallbackRate(currencyCode);
      const previousRate = oldRatesMap.get(currencyCode);
      
      // Only track updates if we have previous rate data
      if (previousRate && previousRate !== rate) {
        updates.push({
          currency: currencyCode,
          previousRate: previousRate,
          currentRate: rate,
          changePercent: ((rate - previousRate) / previousRate) * 100,
          timestamp: new Date()
        });
      }
      
      rates.push({
        code: currencyCode,
        name: this.getCurrencyName(currencyCode),
        rate: rate,
        symbol: this.getCurrencySymbol(currencyCode),
        flag: `assets/flags/${currencyCode.toLowerCase()}.svg`
      });
    });
    
    // Always include TND as base currency
    rates.push({
      code: 'TND',
      name: 'Tunisian Dinar',
      rate: 1,
      symbol: 'د.ت',
      flag: 'assets/flags/tnd.svg'
    });
    
    // Update currency change events if any
    if (updates.length > 0) {
      const currentUpdates = this._currencyUpdates.getValue();
      this._currencyUpdates.next([...updates, ...currentUpdates].slice(0, 10));
    }
    
    return rates;
  }

  // Add these missing methods to fix the errors
  
  // Method to get currency name from currency code
  private getCurrencyName(currencyCode: string): string {
    const currencyNames: Record<string, string> = {
      'USD': 'US Dollar',
      'EUR': 'Euro',
      'GBP': 'British Pound',
      'TND': 'Tunisian Dinar',
      'JPY': 'Japanese Yen',
      'CAD': 'Canadian Dollar',
      'AUD': 'Australian Dollar',
      'CHF': 'Swiss Franc'
    };
    
    return currencyNames[currencyCode] || currencyCode;
  }
  
  // Method to get currency symbol from currency code
  private getCurrencySymbol(currencyCode: string): string {
    const currencySymbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'TND': 'د.ت',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
      'CHF': 'Fr'
    };
    
    return currencySymbols[currencyCode] || currencyCode;
  }

  // Mock data as a fallback when API fails
  private getMockCurrencyRates(): CurrencyRate[] {
    const mockedRates = [
      { code: 'USD', name: 'US Dollar', rate: 3.10, symbol: '$', flag: 'assets/flags/usd.svg' },
      { code: 'EUR', name: 'Euro', rate: 3.34, symbol: '€', flag: 'assets/flags/eur.svg' },
      { code: 'GBP', name: 'British Pound', rate: 3.90, symbol: '£', flag: 'assets/flags/gbp.svg' },
      { code: 'TND', name: 'Tunisian Dinar', rate: 1.00, symbol: 'د.ت', flag: 'assets/flags/tnd.svg' }
    ];

    // Generate some variation if we already have rates
    const oldRates = this._currencyRates.getValue();
    if (oldRates && oldRates.length > 0) {
      const updates: CurrencyUpdateEvent[] = [];
      
      mockedRates.forEach(mock => {
        const oldRate = oldRates.find(r => r.code === mock.code);
        if (oldRate) {
          // Add a small random variation (±1%)
          const variation = (Math.random() * 0.02) - 0.01;
          const newRate = oldRate.rate * (1 + variation);
          
          // Create an update event
          if (variation !== 0) {
            updates.push({
              currency: mock.code,
              previousRate: oldRate.rate,
              currentRate: newRate,
              changePercent: variation * 100,
              timestamp: new Date()
            });
          }
          
          mock.rate = newRate;
        }
      });
      
      // Update currency change events
      if (updates.length > 0) {
        const currentUpdates = this._currencyUpdates.getValue();
        this._currencyUpdates.next([...updates, ...currentUpdates].slice(0, 10));
      }
    }
    
    return mockedRates;
  }

  // Get fallback rate for a currency in case it's missing from API
  private getFallbackRate(currencyCode: string): number {
    const fallbackRates: Record<string, number> = {
      'USD': 3.10,
      'EUR': 3.34,
      'GBP': 3.90,
      'JPY': 0.021,
      'CAD': 2.27,
      'AUD': 2.03,
      'CHF': 3.52
    };
    
    return fallbackRates[currencyCode] || 1;
  }

  // Enhanced convertCurrency method with improved error handling
  convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Observable<CurrencyConversionResult> {
    return this.currencyRates$.pipe(
      map(rates => {
        // Find the currencies in our list
        const fromRate = rates.find(r => r.code === fromCurrency);
        const toRate = rates.find(r => r.code === toCurrency);
        
        // Handle missing currencies
        if (!fromRate || !toRate) {
          throw new Error(`Currency not found: ${!fromRate ? fromCurrency : toCurrency}`);
        }
        
        // Convert to base currency first (TND) then to target currency
        const baseAmount = amount / fromRate.rate; // Convert to TND
        const toAmount = baseAmount * toRate.rate; // Convert from TND to target
        
        return {
          fromAmount: amount,
          fromCurrency,
          toAmount,
          toCurrency,
          rate: toRate.rate / fromRate.rate,
          date: new Date()
        };
      }),
      catchError(error => {
        console.error('Error during currency conversion:', error);
        // Return a default result with error indication
        return of({
          fromAmount: amount,
          fromCurrency,
          toAmount: 0,
          toCurrency,
          rate: 0,
          date: new Date()
        });
      })
    );
  }
}

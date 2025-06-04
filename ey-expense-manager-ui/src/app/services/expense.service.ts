// src/app/services/expense.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map, mergeMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Expense, ExpenseCreate, ExpenseUpdate } from '../models/expense.model';
import { AuthService } from './auth.service';
import { Role } from '../models/user.model';
import { MissionService } from './mission.service';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private apiUrl = `${environment.apiUrl}/api/Expense`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private missionService: MissionService
  ) { }

  getExpenses(): Observable<Expense[]> {
    const currentUser = this.authService.currentUserValue;
    
    // If user is an Associer (Partner), only get expenses for their missions
    if (currentUser && currentUser.role === Role.Associer) {
      return this.getExpensesForPartner(currentUser.id);
    }
    
    // Otherwise, get all expenses (for Admin/Manager)
    return this.http.get<Expense[]>(this.apiUrl);
  }

  // New method to get expenses only for a partner's missions
  private getExpensesForPartner(partnerId: number): Observable<Expense[]> {
    // First get all missions for this partner
    return this.missionService.getMissionsByAssocier(partnerId).pipe(
      mergeMap(missions => {
        // If no missions, return empty expense array
        if (!missions || missions.length === 0) {
          return of([]);
        }
        
        // Get mission IDs
        const missionIds = missions.map(mission => mission.id);
        
        // Get all expenses
        return this.http.get<Expense[]>(this.apiUrl).pipe(
          map(expenses => {
            // Filter expenses to only include those from partner's missions
            return expenses.filter(expense => 
              missionIds.includes(expense.missionId)
            );
          })
        );
      }),
      catchError(this.handleError<Expense[]>('getExpensesForPartner', []))
    );
  }
  
  getExpensesByMission(missionId: number): Observable<Expense[]> {
    return this.http.get<Expense[]>(`${this.apiUrl}/mission/${missionId}`);
  }

  getExpenseById(id: number): Observable<Expense> {
    return this.http.get<Expense>(`${this.apiUrl}/${id}`).pipe(
      tap(expense => {
        // Security check: verify this user can access this expense
        this.verifyAccess(expense);
      }),
      catchError(this.handleError<Expense>('getExpenseById'))
    );
  }

  // Method to verify current user can access this expense
  private verifyAccess(expense: Expense): void {
    const currentUser = this.authService.currentUserValue;
    
    // Admin and Manager can access all expenses
    if (currentUser?.role === Role.Admin || currentUser?.role === Role.Manager) {
      return;
    }
    
    // For Partners (Associers), verify this expense belongs to one of their missions
    if (currentUser?.role === Role.Associer) {
      this.missionService.getMissionsByAssocier(currentUser.id).subscribe(
        missions => {
          const missionIds = missions.map(m => m.id);
          if (!missionIds.includes(expense.missionId)) {
            console.error('Access denied: This expense does not belong to any of your missions');
            // You could redirect or show an error message here
          }
        }
      );
    }
  }

  getExpensesByStatus(status: string): Observable<Expense[]> {
    return this.http.get<Expense[]>(`${this.apiUrl}/status/${status}`);
  }

  getExpensesByCategory(category: string): Observable<Expense[]> {
    return this.http.get<Expense[]>(`${this.apiUrl}/category/${category}`);
  }

  getTotalExpensesByMission(missionId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/mission/${missionId}/total`);
  }

  createExpense(expense: ExpenseCreate): Observable<Expense> {
    return this.http.post<Expense>(this.apiUrl, expense);
  }

  updateExpense(id: number, expense: ExpenseUpdate): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, expense);
  }

  deleteExpense(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }
}
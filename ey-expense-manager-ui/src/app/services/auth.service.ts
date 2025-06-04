import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { UserLogin, User, Role } from '../models/user.model';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private apiUrl = `${environment.apiUrl}/api/User`;
  private tokenExpirationTimer: any;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Check if user is already logged in from localStorage
    this.loadUserFromLocalStorage();
  }

  private loadUserFromLocalStorage() {
    const userData = localStorage.getItem('user');
    const tokenExpirationDate = localStorage.getItem('tokenExpiration');
    
    if (userData && tokenExpirationDate) {
      const user = JSON.parse(userData);
      const expirationDate = new Date(tokenExpirationDate);
      
      // If token is still valid
      if (expirationDate > new Date()) {
        this.currentUserSubject.next(user);
        this.autoLogout(expirationDate.getTime() - new Date().getTime());
        
        // Make sure token is stored separately for interceptor
        if (user.token && !localStorage.getItem('auth_token')) {
          localStorage.setItem('auth_token', user.token);
        }
      } else {
        this.logout();
      }
    }
  }

  login(credentials: UserLogin): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/authenticate`, credentials)
      .pipe(
        tap(user => {
          console.log('Login successful, user data:', user);
          // Store user details and token
          const expirationDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000); // Token valid for 7 days
          
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('auth_token', user.token || '');
          localStorage.setItem('tokenExpiration', expirationDate.toISOString());
          
          this.currentUserSubject.next(user);
          this.autoLogout(7 * 24 * 60 * 60 * 1000);
          
          // Handle first login/password change required
          if (user.passwordChangeRequired) {
            this.router.navigate(['/reset-password'], { 
              queryParams: { 
                userId: user.id,
                token: user.passwordResetToken
              }
            });
            return;
          }
          
          // Redirect to appropriate dashboard based on role
          this.redirectBasedOnRole(user.role);
        }),
        catchError(error => {
          console.error('Login error:', error);
          return throwError(() => new Error(error.error?.message || 'Login failed'));
        })
      );
  }

  /**
   * Redirect user to appropriate dashboard based on role
   */
  redirectBasedOnRole(role: Role): void {
    switch (role) {
      case Role.Admin:
        this.router.navigate(['/admin/dashboard']);
        break;
      case Role.Manager:
        this.router.navigate(['/admin/dashboard']); 
        break;
      case Role.Associer:
        this.router.navigate(['/partner/dashboard']);
        break;
      case Role.Employe:
      case Role.User:
      default:
        this.router.navigate(['/missions']); // Regular users go to missions
        break;
    }
  }

  logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('tokenExpiration');
    
    this.currentUserSubject.next(null);
    
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
    
    this.router.navigate(['/login']);
  }

  autoLogout(expirationDuration: number): void {
    this.tokenExpirationTimer = setTimeout(() => {
      this.logout();
    }, expirationDuration);
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value?.token;
  }

  hasRole(role: number): boolean {
    const user = this.currentUserValue;
    return user !== null && user.role === role;
  }
  
  refreshToken(): void {
    // Re-load user data from local storage
    this.loadUserFromLocalStorage();
  }

  // Add this method to determine the appropriate dashboard URL
  public getDashboardRouteForCurrentUser(): string {
    const currentUser = this.currentUserValue;
    
    if (!currentUser) return '/login';
    
    // Redirect based on role
    switch (currentUser.role) {
      case Role.Admin:
      case Role.Manager:
        return '/admin/dashboard';
      case Role.Associer:
        return '/partner/dashboard';
      case Role.Employe:
      default:
        return '/missions'; // Default for employees or unknown roles
    }
  }
}

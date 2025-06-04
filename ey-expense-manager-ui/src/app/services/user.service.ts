import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, tap } from 'rxjs';
import { User, UserCreate, UserUpdate, Role } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/api/User`;
  
  constructor(private http: HttpClient) { 
    console.log('UserService initialized with API URL:', this.apiUrl);
  }
  
  getUsers(): Observable<User[]> {
    console.log('Fetching all users from:', `${this.apiUrl}`);
    return this.http.get<User[]>(this.apiUrl)
      .pipe(
        tap(users => console.log('Users fetched successfully, count:', users.length)),
        catchError(this.handleError('getUsers'))
      );
  }
  
  getUserById(id: number): Observable<User> {
    console.log('Fetching user by ID:', id);
    return this.http.get<User>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(user => console.log('User fetched successfully:', user.id)),
        catchError(this.handleError('getUserById'))
      );
  }

  getAssociers(): Observable<User[]> {
    console.log('Fetching associers from:', `${this.apiUrl}/associers`);
    return this.http.get<User[]>(`${this.apiUrl}/associers`)
      .pipe(
        tap(users => console.log('Associers fetched successfully, count:', users.length)),
        catchError(this.handleError('getAssociers'))
      );
  }
  
  getUsersByRole(role: Role): Observable<User[]> {
    console.log('Fetching users by role:', role);
    return this.http.get<User[]>(`${this.apiUrl}/role/${role}`)
      .pipe(
        tap(users => console.log('Users fetched successfully by role, count:', users.length)),
        catchError(this.handleError('getUsersByRole'))
      );
  }
  
  createUser(formData: FormData): Observable<User> {
    console.log('Creating user with form data');
    return this.http.post<User>(this.apiUrl, formData)
      .pipe(
        tap(user => console.log('User created successfully:', user.id)),
        catchError(this.handleError('createUser'))
      );
  }
  
  updateUser(id: number, formData: FormData): Observable<void> {
    console.log('Updating user with ID:', id);
    return this.http.put<void>(`${this.apiUrl}/${id}`, formData)
      .pipe(
        tap(() => console.log('User updated successfully:', id)),
        catchError(this.handleError('updateUser'))
      );
  }
  
  deleteUser(id: number): Observable<void> {
    console.log('Deleting user with ID:', id);
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(() => console.log('User deleted successfully:', id)),
        catchError(this.handleError('deleteUser'))
      );
  }
  
  authenticate(email: string, password: string): Observable<User> {
    console.log('Authenticating user with email:', email);
    return this.http.post<User>(`${this.apiUrl}/authenticate`, { email, password })
      .pipe(
        tap(user => console.log('User authenticated successfully:', user.id)),
        catchError(this.handleError('authenticate'))
      );
  }
  
  verifyUser(userId: number, token: string, isApproved: boolean): Observable<void> {
    console.log('Verifying user with ID:', userId);
    return this.http.post<void>(`${this.apiUrl}/verify`, {
      userId: userId,
      token: token,
      isApproved: isApproved
    })
      .pipe(
        tap(() => console.log('User verified successfully:', userId)),
        catchError(this.handleError('verifyUser'))
      );
  }
  
  requestPasswordReset(email: string): Observable<void> {
    console.log('Requesting password reset for email:', email);
    return this.http.post<void>(`${this.apiUrl}/request-password-reset`, { email })
      .pipe(
        tap(() => console.log('Password reset requested successfully for email:', email)),
        catchError(this.handleError('requestPasswordReset'))
      );
  }
  
  resetPassword(userId: number, token: string, newPassword: string): Observable<void> {
    console.log('Resetting password for user ID:', userId);
    return this.http.post<void>(`${this.apiUrl}/reset-password`, {
      userId: userId,
      token: token,
      newPassword: newPassword
    })
      .pipe(
        tap(() => console.log('Password reset successfully for user ID:', userId)),
        catchError(this.handleError('resetPassword'))
      );
  }
  
  getPendingVerifications(): Observable<User[]> {
    console.log('Fetching pending verifications');
    return this.http.get<User[]>(`${this.apiUrl}/pending-verifications`)
      .pipe(
        tap(users => console.log('Pending verifications fetched successfully, count:', users.length)),
        catchError(this.handleError('getPendingVerifications'))
      );
  }

  private handleError(operation: string) {
    return (error: HttpErrorResponse) => {
      console.error(`${operation} error:`, error);
      if (error.error instanceof ErrorEvent) {
        console.error('Client-side error:', error.error.message);
      } else {
        console.error(
          `Backend returned code ${error.status}, ` +
          `body was: ${JSON.stringify(error.error)}`
        );
      }
      throw error;
    };
  }
}

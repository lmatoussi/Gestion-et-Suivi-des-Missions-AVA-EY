// src/app/services/mission.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Mission, MissionCreate, MissionUpdate } from '../models/Mission';
import { AuthService } from './auth.service';
import { Role } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class MissionService {
  private apiUrl = `${environment.apiUrl}/api/Mission`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  getMissions(): Observable<Mission[]> {
    const currentUser = this.authService.currentUserValue;
    
    // If user is an Associer (Partner), only get their missions
    if (currentUser && currentUser.role === Role.Associer) {
      return this.getMissionsByAssocier(currentUser.id);
    }
    
    // Otherwise, get all missions (for Admin/Manager)
    return this.http.get<Mission[]>(this.apiUrl);
  }

  getMissionById(id: number): Observable<Mission> {
    return this.http.get<Mission>(`${this.apiUrl}/${id}`);
  }

  getMissionByIdMission(idMission: string): Observable<Mission> {
    return this.http.get<Mission>(`${this.apiUrl}/idmission/${idMission}`);
  }

  getMissionsByClient(client: string): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.apiUrl}/client/${client}`);
  }

  getMissionsByStatus(status: string): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.apiUrl}/status/${status}`);
  }

  /**
   * Get missions assigned to a specific associer/partner
   */
  getMissionsByAssocier(associerId: number): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.apiUrl}/associer/${associerId}`).pipe(
      catchError(this.handleError<Mission[]>('getMissionsByAssocier', []))
    );
  }

  createMission(mission: MissionCreate): Observable<Mission> {
    return this.http.post<Mission>(this.apiUrl, mission);
  }

  updateMission(id: number, mission: MissionUpdate): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, mission);
  }

  deleteMission(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(error);
      return of(result as T);
    };
  }
}

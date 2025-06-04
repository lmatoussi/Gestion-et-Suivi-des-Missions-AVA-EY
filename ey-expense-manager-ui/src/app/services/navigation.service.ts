import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Role } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  constructor(private authService: AuthService) {}

  /**
   * Check if the current user is an admin
   */
  isAdmin(): boolean {
    return this.authService.currentUserValue?.role === Role.Admin;
  }

  /**
   * Check if the current user is a manager
   */
  isManager(): boolean {
    return this.authService.currentUserValue?.role === Role.Manager;
  }

  /**
   * Check if the current user is a partner/associer
   */
  isPartner(): boolean {
    return this.authService.currentUserValue?.role === Role.Associer;
  }

  /**
   * Check if the current user is an employee
   */
  isEmployee(): boolean {
    return this.authService.currentUserValue?.role === Role.Employe;
  }

  /**
   * Check if the current user can access admin dashboard
   */
  canAccessAdminDashboard(): boolean {
    return this.isAdmin() || this.isManager();
  }

  /**
   * Check if the current user can manage users
   */
  canManageUsers(): boolean {
    return this.isAdmin();
  }

  /**
   * Check if current user can access certain roles
   */
  canAccess(roles: Role[]): boolean {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return false;
    
    return roles.includes(currentUser.role);
  }

  /**
   * Check if the current user can create missions
   */
  canCreateMissions(): boolean {
    return this.isAdmin() || this.isPartner();
  }

  /**
   * Check if the current user can delete missions
   */
  canDeleteMissions(): boolean {
    return this.isAdmin();
  }

  /**
   * Check if the current user can create expenses
   */
  canCreateExpenses(): boolean {
    return this.isAdmin() || this.isManager() || this.isPartner();
  }

  /**
   * Check if the current user can delete expenses
   */
  canDeleteExpenses(): boolean {
    return this.isAdmin();
  }

  /**
   * Check if the current user can allocate budget
   */
  canAllocateBudget(): boolean {
    return this.isAdmin();
  }

  /**
   * Check if the current user can export reports
   */
  canExportReports(): boolean {
    return this.isAdmin() || this.isManager();
  }

  /**
   * Get the appropriate dashboard route based on user role
   */
  getDashboardRoute(): string {
    if (this.isAdmin() || this.isManager()) {
      return '/admin/dashboard';
    } else if (this.isPartner()) {
      return '/partner/dashboard';
    } else {
      return '/missions';
    }
  }
}

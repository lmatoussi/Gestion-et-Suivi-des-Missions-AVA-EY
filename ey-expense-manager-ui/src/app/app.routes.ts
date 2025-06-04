import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';
import { roleGuard } from './services/role.guard';
import { Role } from './models/user.model';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';

export const routes: Routes = [
  { 
    path: '', 
    canActivate: [authGuard],
    resolve: {
      dashboard: () => {
        const authService = inject(AuthService);
        return authService.getDashboardRouteForCurrentUser();
      }
    },
    // Use redirectTo instead of component
    redirectTo: '',
    pathMatch: 'full',
    // This will be processed at runtime
    runGuardsAndResolvers: 'always'
  },
  { path: 'login', loadComponent: () => import('./components/login/login.component').then(c => c.LoginComponent) },
  { path: 'register', loadComponent: () => import('./components/register/register.component').then(c => c.RegisterComponent) },
  { path: 'forgot-password', loadComponent: () => import('./components/forgot-password/forgot-password.component').then(c => c.ForgotPasswordComponent) },
  { path: 'reset-password', loadComponent: () => import('./components/reset-password/reset-password.component').then(c => c.ResetPasswordComponent) },
  { path: 'verify-user', loadComponent: () => import('./components/verify-user/verify-user.component').then(c => c.VerifyUserComponent) },
  
  // Admin section with auth guard
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: [Role.Admin] }, // Only Admin and Manager can access admin routes
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./components/admin-dashboard/admin-dashboard.component').then(c => c.AdminDashboardComponent)
      },
      {
        path: 'users',
        canActivate: [roleGuard],
        data: { roles: [Role.Admin ] }, // Only Admin can manage users
        loadComponent: () => import('./components/user-list/user-list.component').then(c => c.UserListComponent)
      },
      {
        path: 'users/:id/edit',
        canActivate: [roleGuard],
        data: { roles: [Role.Admin] },
        loadComponent: () => import('./components/user-edit/user-edit.component').then(c => c.UserEditComponent)
      }
    ]
  },
  
  // Partner Dashboard - specific for partners and admins
  {
    path: 'partner',
    canActivate: [authGuard, roleGuard],
    data: { roles: [Role.Associer, Role.Admin] }, // Allow both partners and admins
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./components/partner-dashboard/partner-dashboard.component').then(c => c.PartnerDashboardComponent)
      },
      {
        path: 'dashboard/:partnerId',
        loadComponent: () => import('./components/partner-dashboard/partner-dashboard.component').then(c => c.PartnerDashboardComponent)
      }
    ]
  },
  
  // Mission routes with appropriate guards
  {
    path: 'missions',
    canActivate: [authGuard], // All authenticated users can view missions list
    children: [
      {
        path: '',
        loadComponent: () => import('./components/mission-list/mission-list.component').then(c => c.MissionListComponent)
      },
      {
        path: 'create',
        canActivate: [roleGuard],
        data: { roles: [Role.Admin, Role.Associer] }, // Admin and Partners can create missions
        loadComponent: () => import('./components/mission-create/mission-create.component').then(c => c.MissionCreateComponent)
      },
      {
        path: 'edit/:id',
        canActivate: [roleGuard],
        data: { roles: [Role.Admin, Role.Associer] }, // Admin and Partners can edit missions
        loadComponent: () => import('./components/mission-edit/mission-edit.component').then(c => c.MissionEditComponent)
      },
      {
        path: ':missionId/expenses',
        loadComponent: () => import('./components/expense-list/expense-list.component').then(c => c.ExpenseListComponent)
      },
      {
        path: ':missionId/expenses/create',
        loadComponent: () => import('./components/expense-create/expense-create.component').then(c => c.ExpenseCreateComponent)
      },
      {
        path: ':missionId/expenses/:id/edit',
        loadComponent: () => import('./components/expense-edit/expense-edit.component').then(c => c.ExpenseEditComponent)
      },
      {
        path: ':missionId/expenses/create-from-document',
        loadComponent: () => import('./components/expense-document-upload/expense-document-upload.component').then(c => c.ExpenseDocumentUploadComponent)
      }
    ]
  },
  
  // Expense routes with role-based restrictions
  {
    path: 'expenses',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/expense-list/expense-list.component').then(c => c.ExpenseListComponent)
      },
      {
        path: 'create',
        loadComponent: () => import('./components/expense-create/expense-create.component').then(c => c.ExpenseCreateComponent)
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./components/expense-edit/expense-edit.component').then(c => c.ExpenseEditComponent)
      },
      {
        path: 'create-from-document',
        loadComponent: () => import('./components/expense-document-upload/expense-document-upload.component').then(c => c.ExpenseDocumentUploadComponent)
      }
    ]
  },
  
  // User details route - admin only
  {
    path: 'users/:id',
    canActivate: [roleGuard],
    data: { roles: [Role.Admin] }, // Only admins can view detailed user profiles
    loadComponent: () => import('./components/user-details/user-details.component').then(c => c.UserDetailsComponent)
  },
  
  // Fallback route
  { path: '**', redirectTo: '/login' }
];

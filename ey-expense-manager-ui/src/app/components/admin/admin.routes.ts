import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout/admin-layout.component';
import { roleGuard } from '../../services/role.guard';
import { Role } from '../../models/user.model';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('../dashboard/dashboard.component').then(c => c.DashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('../user-list/user-list.component').then(c => c.UserListComponent),
        canActivate: [roleGuard],
        data: { roles: [Role.Admin] }
      },
      {
        path: 'profile',
        loadComponent: () => import('../user-profile/user-profile.component').then(c => c.UserProfileComponent)
      },
      // Add more admin routes as needed
    ]
  }
];

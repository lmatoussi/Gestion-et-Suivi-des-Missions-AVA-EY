import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from '../models/user.model';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  console.log('Role Guard executing for route:', route.routeConfig?.path);
  console.log('Current user role:', authService.currentUserValue?.role);

  // First check if user is logged in
  if (!authService.isLoggedIn()) {
    console.warn('User not logged in, redirecting to login');
    router.navigate(['/login'], { 
      queryParams: { returnUrl: router.url }
    });
    return false;
  }
  
  // Get the roles from the route data
  const requiredRoles = route.data['roles'] as Role[];
  
  // If no specific roles are required (undefined or empty array), allow access to logged-in users
  if (!requiredRoles || requiredRoles.length === 0) {
    console.log('No role restrictions, allowing access');
    return true;
  }
  
  const currentUser = authService.currentUserValue;
  
  // Check if the user has one of the required roles
  if (currentUser && requiredRoles.includes(currentUser.role)) {
    console.log('User has required role, granting access');
    return true;
  }
  
  // User lacks required role
  console.warn('User lacks required role, redirecting to dashboard');
  router.navigate(['/admin/dashboard']);
  return false;
};

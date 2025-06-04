import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('Auth Guard executing for route:', route.routeConfig?.path);
  console.log('Current user:', authService.currentUserValue);
  console.log('Is logged in:', authService.isLoggedIn());

  // Check if the user is logged in
  if (!authService.isLoggedIn()) {
    console.warn('Auth Guard: User not logged in, redirecting to login');
    router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
    return false;
  }

  // If no specific roles are required for this route, just check if user is logged in
  if (!route.data['roles']) {
    console.log('Auth Guard: No specific roles required, granting access');
    return true;
  }

  // Get the current user
  const currentUser = authService.currentUserValue;
  
  // Check if user has one of the required roles
  const requiredRoles = route.data['roles'] as number[];
  console.log('Required roles:', requiredRoles, 'User role:', currentUser?.role);
  
  if (requiredRoles.includes(currentUser!.role)) {
    console.log('Auth Guard: User has required role, granting access');
    return true;
  }

  // If user doesn't have the required role, redirect to dashboard
  console.warn('Auth Guard: User lacks required role, redirecting to dashboard');
  router.navigate(['/admin/dashboard']);
  return false;
};

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { User, Role } from '../../models/user.model';
import { UserService } from '../../services/user.service';
import { environment } from '../../../environments/environment';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  isLoading = true;
  errorMessage = '';
  filterForm: FormGroup<{
    searchTerm: FormControl<string>;
    role: FormControl<string>;
  }>;
  roles = Role;
  
  private roleNames: { [key: number]: string } = {
    1: 'Admin',
    2: 'User',
    3: 'Manager',
    4: 'Partner',
    5: 'Employe'
  };

  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.filterForm = this.fb.nonNullable.group({
      searchTerm: '',
      role: 'all'
    });
  }

  // Getter methods for type-safe form controls
  get searchTermControl(): FormControl<string> {
    return this.filterForm.controls.searchTerm;
  }

  get roleControl(): FormControl<string> {
    return this.filterForm.controls.role;
  }

  ngOnInit(): void {
    console.log('=== User List Component initialized ===');
    console.log('Environment API URL:', environment.apiUrl);
    console.log('Current user:', this.authService.currentUserValue);
    
    // Check if user is authorized
    if (!this.authService.isLoggedIn()) {
      console.error('User not logged in - should not access this page');
      return;
    }
    
    if (this.authService.currentUserValue?.role !== Role.Admin) {
      console.warn('User is not admin, role:', this.authService.currentUserValue?.role);
    }
    
    this.loadUsers();
    
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    console.log('Loading users...');
    this.userService.getUsers().subscribe({
      next: (users) => {
        console.log('Users loaded successfully:', users);
        this.users = users.map(user => ({
          ...user,
          profileImageUrl: user.profileImageUrl 
            ? `${environment.apiUrl}${user.profileImageUrl}`
            : undefined
        }));
        this.filteredUsers = this.users;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.errorMessage = `Failed to load users: ${error.message || 'Unknown error'}`;
        this.isLoading = false;
      }
    });
  }

  loadUsersByRole(role: Role): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.userService.getUsersByRole(role).subscribe({
      next: (users) => {
        this.users = users.map(user => ({
          ...user,
          profileImageUrl: user.profileImageUrl 
            ? `${environment.apiUrl}/api/user/${user.id}/profile-image`
            : undefined
        }));
        this.filteredUsers = this.users;
        this.isLoading = false;
      },
      error: (error) => {
        console.error(`Error loading users with role ${role}:`, error);
        this.errorMessage = 'Failed to load users. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    const { searchTerm, role } = this.filterForm.getRawValue();
    
    if (role !== 'all') {
      this.loadUsersByRole(Number(role));
      return;
    } else if (role === 'all' && this.roleControl.dirty) {
      this.loadUsers();
      return;
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      this.filteredUsers = this.users.filter(user => 
        (user.nameUser?.toLowerCase().includes(term)) ||
        (user.surname?.toLowerCase().includes(term)) ||
        (user.email?.toLowerCase().includes(term)) ||
        (user.idUser?.toLowerCase().includes(term)) ||
        (user.gpn?.toLowerCase().includes(term))
      );
    } else {
      this.filteredUsers = this.users;
    }
  }

  deleteUser(id: number): void {
    if (confirm('Are you sure you want to delete this user?')) {
      this.userService.deleteUser(id).subscribe({
        next: () => {
          this.users = this.users.filter(user => user.id !== id);
          this.filteredUsers = this.filteredUsers.filter(user => user.id !== id);
          alert('User deleted successfully');
        },
        error: (error) => {
          console.error('Error deleting user:', error);
          alert('Failed to delete user');
        }
      });
    }
  }

  getRoleName(role: Role): string {
    return this.roleNames[role];
  }

  handleImageError(event: any): void {
    event.target.style.display = 'none';
    const placeholder = event.target.parentElement.querySelector('.avatar-placeholder');
    if (!placeholder) {
      const div = document.createElement('div');
      div.className = 'avatar-placeholder';
      div.textContent = this.getInitials(event.target.parentElement.dataset.user);
      event.target.parentElement.appendChild(div);
    } else {
      placeholder.style.display = 'flex';
    }
  }

  getInitials(user: User): string {
    if (!user || !user.nameUser || !user.surname) return '';
    return `${user.nameUser.charAt(0).toUpperCase()}${user.surname.charAt(0).toUpperCase()}`;
  }

  downloadExcel(): void {
    // Implementation would go here
    alert('Excel export functionality would be implemented here');
  }

  downloadPDF(): void {
    // Implementation would go here
    alert('PDF export functionality would be implemented here');
  }

  getUserIcon(role: Role): string {
    switch (role) {
      case Role.Admin:
        return 'admin_panel_settings';
      case Role.Manager:
        return 'manage_accounts';
      case Role.Associer:
        return 'groups';
      case Role.Employe:
        return 'badge';
      case Role.User:
      default:
        return 'person';
    }
  }

  getRoleIcon(role: Role): string {
    switch (role) {
      case Role.Admin:
        return 'security';
      case Role.Manager:
        return 'supervisor_account';
      case Role.Associer:
        return 'people';
      case Role.Employe:
        return 'work';
      case Role.User:
      default:
        return 'person';
    }
  }
}

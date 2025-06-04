import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { User, Role } from '../../models/user.model';
import { UserService } from '../../services/user.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss']
})
export class UserDetailsComponent implements OnInit {
  user: User | null = null;
  isLoading = true;
  errorMessage = '';
  
  private roleNames: { [key: number]: string } = {
    [Role.Admin]: 'Admin',
    [Role.User]: 'User',
    [Role.Manager]: 'Manager',
    [Role.Associer]: 'Partner',
    [Role.Employe]: 'Employe'
  };

  constructor(
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.loadUserDetails(+userId);
    } else {
      this.errorMessage = 'User ID is missing';
      this.isLoading = false;
    }
  }

  loadUserDetails(userId: number): void {
    this.isLoading = true;
    this.errorMessage = '';
        
    this.userService.getUserById(userId).subscribe({
      next: (user) => {
        this.user = user;
        // Ensure correct image URL format
        if (this.user && this.user.profileImageUrl) {
          // Only add the full URL if it's not already an absolute URL
          if (!this.user.profileImageUrl.startsWith('http')) {
            // Ensure user.id exists before using it
            this.user.profileImageUrl = `${environment.apiUrl}/api/user/${this.user.id || userId}/profile-image`;
          }
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user details:', error);
        this.errorMessage = 'Failed to load user details. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  getRoleName(role: Role): string {
    return this.roleNames[role] || 'Unknown';
  }

  goBack(): void {
    this.router.navigate(['/users']);
  }

  handleImageError(event: any): void {
    event.target.style.display = 'none';
    const parent = event.target.parentElement;
    
    if (!parent.querySelector('.avatar-placeholder')) {
      const div = document.createElement('div');
      div.className = 'avatar-placeholder';
      if (this.user) {
        div.textContent = `${this.user.nameUser.charAt(0).toUpperCase()}${this.user.surname.charAt(0).toUpperCase()}`;
      }
      parent.appendChild(div);
    } else {
      const avatar = parent.querySelector('.avatar-placeholder');
      if (avatar) {
        avatar.style.display = 'flex';
      }
    }
  }
  
  deleteUser(id: number): void {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      this.userService.deleteUser(id).subscribe({
        next: () => {
          this.router.navigate(['/users'], { 
            queryParams: { deleted: 'success' }
          });
        },
        error: (error) => {
          console.error('Error deleting user:', error);
          this.errorMessage = 'Failed to delete user. Please try again later.';
        }
      });
    }
  }
}
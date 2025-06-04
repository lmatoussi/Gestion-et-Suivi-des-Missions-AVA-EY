import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="profile-container">
      <h1>User Profile</h1>
      <div *ngIf="isLoading" class="loading">Loading profile...</div>
      <div *ngIf="errorMessage" class="error">{{ errorMessage }}</div>
      
      <div *ngIf="!isLoading && !errorMessage" class="profile-content">
        <!-- Profile content will be implemented later -->
        <p>User profile information will be displayed here</p>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      padding: 20px;
    }
    
    h1 {
      color: #2468e5;
      margin-bottom: 20px;
    }
    
    .loading, .error {
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    
    .loading {
      background-color: #e3f2fd;
      color: #0d47a1;
    }
    
    .error {
      background-color: #ffebee;
      color: #c62828;
    }
  `]
})
export class UserProfileComponent implements OnInit {
  profileForm!: FormGroup;
  user: User | null = null;
  isLoading = true;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // This is just a placeholder, actual implementation will be added later
    this.isLoading = false;
  }
}

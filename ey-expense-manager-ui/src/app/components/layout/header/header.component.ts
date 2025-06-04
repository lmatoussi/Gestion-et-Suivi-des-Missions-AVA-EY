import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { User } from '../../../models/user.model';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatToolbarModule,  // ✅ Toolbar support
    MatButtonModule 
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  user?: User;
  profileImageUrl: string = 'assets/default-avatar.png'; // fallback avatar
  private subscription?: Subscription;

  constructor(
    public authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to currentUser$ observable to get logged-in user info
    this.subscription = this.authService.currentUser$.subscribe(currentUser => {
      if (currentUser && currentUser.id) {
        this.loadUserDetails(currentUser.id);
      } else {
        this.user = undefined;
        this.profileImageUrl = 'assets/default-avatar.png';
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private loadUserDetails(userId: number): void {
    this.userService.getUserById(userId).subscribe({
      next: (user) => {
        if (user) {  // Add null check here
          this.user = user;
          // Construct the correct URL for profile image using API endpoint
          if (user.profileImageUrl) {
            // Use the direct API endpoint to get the profile image
            this.profileImageUrl = `${environment.apiUrl}/api/user/${user.id}/profile-image`;
          } else {
            this.profileImageUrl = 'assets/default-avatar.png';
          }
        } else {
          this.profileImageUrl = 'assets/default-avatar.png';
        }
      },
      error: (err) => {
        console.error('Failed to load user info', err);
        this.profileImageUrl = 'assets/default-avatar.png';
      }
    });
  }

  handleImageError(): void {
    // If image fails to load, use default avatar
    this.profileImageUrl = 'assets/default-avatar.png';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
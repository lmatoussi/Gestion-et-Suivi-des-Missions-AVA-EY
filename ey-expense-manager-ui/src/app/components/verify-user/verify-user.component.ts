import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-verify-user',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-user.component.html',
  styleUrls: ['./verify-user.component.scss']
})
export class VerifyUserComponent implements OnInit {
  userId: number | null = null;
  token: string | null = null;
  loading: boolean = true;
  error: string | null = null;
  success: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.userId = Number(params['userId']);
      this.token = params['token'];
      
      if (this.userId && this.token) {
        // Don't auto verify, let admin choose to verify or reject
        this.loading = false;
      } else {
        this.loading = false;
        this.error = 'Invalid verification link. Missing parameters.';
      }
    });
  }

  verifyUser(): void {
    if (!this.userId || !this.token) return;
    
    this.loading = true;
    this.userService.verifyUser(this.userId, this.token, true).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Failed to verify user. Please try again later.';
        console.error('Verification error:', error);
      }
    });
  }

  rejectUser(): void {
    if (!this.userId || !this.token) return;
    
    if (confirm('Are you sure you want to reject this user?')) {
      this.loading = true;
      this.userService.verifyUser(this.userId, this.token, false).subscribe({
        next: () => {
          this.loading = false;
          this.success = true;
          alert('User rejected successfully');
        },
        error: (error) => {
          this.loading = false;
          this.error = error.error?.message || 'Failed to reject user. Please try again later.';
          console.error('Rejection error:', error);
        }
      });
    }
  }
}

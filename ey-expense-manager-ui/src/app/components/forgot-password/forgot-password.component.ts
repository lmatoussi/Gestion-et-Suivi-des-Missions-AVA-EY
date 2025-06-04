import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm!: FormGroup;
  loading = false;
  submitted = false;
  success = false;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  // Convenience getter for easy access to form fields
  get f() { return this.forgotPasswordForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';

    if (this.forgotPasswordForm.invalid) {
      return;
    }

    this.loading = true;
    this.userService.requestPasswordReset(this.f['email'].value)
      .subscribe({
        next: () => {
          this.success = true;
          this.loading = false;
        },
        error: (error) => {
          // We still show success message even on error to prevent email fishing
          this.success = true;
          this.loading = false;
          // Uncomment for debugging only
          // this.error = error.error?.message || 'Failed to send reset link';
        }
      });
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  resetForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  success = false;
  userId: number | null = null;
  token: string | null = null;
  passwordVisibility = false;
  confirmPasswordVisibility = false;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.resetForm = this.formBuilder.group({
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{6,}$/)
      ]],
      confirmPassword: ['', Validators.required]
    }, {
      validator: this.mustMatch('password', 'confirmPassword')
    });

    this.route.queryParams.subscribe(params => {
      this.userId = Number(params['userId']);
      this.token = params['token'];
      
      if (!this.userId || !this.token) {
        this.error = 'Invalid password reset link. Missing parameters.';
      }
    });
  }

  // Convenience getter for easy access to form fields
  get f() { return this.resetForm.controls; }

  mustMatch(controlName: string, matchingControlName: string) {
    return (formGroup: FormGroup) => {
      const control = formGroup.controls[controlName];
      const matchingControl = formGroup.controls[matchingControlName];

      if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
        // Return if another validator has already found an error
        return;
      }

      // Set error on matchingControl if validation fails
      if (control.value !== matchingControl.value) {
        matchingControl.setErrors({ mustMatch: true });
      } else {
        matchingControl.setErrors(null);
      }
    };
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.passwordVisibility = !this.passwordVisibility;
    } else {
      this.confirmPasswordVisibility = !this.confirmPasswordVisibility;
    }
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';

    // Stop here if form is invalid
    if (this.resetForm.invalid || !this.userId || !this.token) {
      return;
    }

    this.loading = true;
    this.userService.resetPassword(this.userId, this.token, this.f['password'].value)
      .subscribe({
        next: () => {
          this.success = true;
          this.loading = false;
        },
        error: (error) => {
          this.error = error.error?.message || 'Password reset failed. Please try again.';
          this.loading = false;
        }
      });
  }
}

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { first } from 'rxjs/operators';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({standalone: true,
  imports: [
    CommonModule,       // For *ngIf, *ngFor
    ReactiveFormsModule, // For formGroup
    RouterLink
  ],

  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  errorMessage = '';
  passwordVisibility = false;
  returnUrl: string = '/admin/dashboard';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/admin/dashboard']);
    }

    // Get return URL from route parameters or default to '/admin/dashboard'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin/dashboard';

    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // Convenience getter for easy access to form fields
  get f() { return this.loginForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    // Stop here if form is invalid
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.authService.login({
      email: this.f['email'].value,
      password: this.f['password'].value
    })
      .pipe(first())
      .subscribe({
        next: () => {
          // Navigate to return URL or dashboard
          this.router.navigate([this.returnUrl]);
        },
        error: error => {
          this.errorMessage = error.error || 'Login failed. Please check your credentials.';
          this.loading = false;
        }
      });
  }
  
  togglePasswordVisibility() {
    this.passwordVisibility = !this.passwordVisibility;
  }
}
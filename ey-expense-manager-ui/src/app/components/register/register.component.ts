import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Role, UserCreate } from '../../models/user.model';
import { UserService } from '../../services/user.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  roles: number[] = Object.values(Role).filter((v) => !isNaN(Number(v))) as number[];
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isSubmitting = false;
  passwordVisibility = false;

  private roleNames: { [key: number]: string } = {
    1: 'Admin',
    2: 'User',
    3: 'Manager',
    4: 'Partner',
    5: 'Employe'
  };

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      idUser: ['', [Validators.required, Validators.maxLength(50)]],
      nameUser: ['', [Validators.required, Validators.maxLength(100)]],
      surname: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{6,}$/)
      ]],
      role: [2, Validators.required], // Default to User role
      gpn: ['', Validators.maxLength(50)]
    });
  }

  ngOnInit(): void {}

  getRoleName(role: number): string {
    return this.roleNames[role];
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length) {
      this.selectedFile = input.files[0];

      // File size validation
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (this.selectedFile.size > maxSize) {
        alert('File size must be less than 5MB');
        this.selectedFile = null;
        return;
      }

      // File type validation
      if (this.selectedFile.type !== 'image/jpeg' && this.selectedFile.type !== 'image/png') {
        alert('Only JPEG or PNG images are allowed');
        this.selectedFile = null;
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  togglePasswordVisibility() {
    this.passwordVisibility = !this.passwordVisibility;
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.isSubmitting = true;

      // Create FormData object
      const formData = new FormData();

      // Add form values to FormData
      Object.keys(this.registerForm.value).forEach(key => {
        formData.append(key, this.registerForm.value[key]);
      });

      // Add profile image if selected
      if (this.selectedFile) {
        formData.append('profileImage', this.selectedFile);
      }

      this.userService.createUser(formData).subscribe({
        next: (response) => {
          console.log('User registered successfully', response);
          this.router.navigate(['/login']);
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Error registering user', error);

          if (error instanceof HttpErrorResponse) {
            if (error.status === 400) {
              // Handle validation errors
              if (error.error?.errors) {
                const validationErrors = Object.entries(error.error.errors)
                  .map(([field, messages]) => `${field}: ${messages}`)
                  .join('\n');
                alert(`Validation errors:\n${validationErrors}`);
              } else {
                alert(`Error: ${error.error?.message || 'Invalid request'}`);
              }
            } else {
              alert(`Error: ${error.error?.message || 'Registration failed'}`);
            }
          } else {
            alert('An unknown error occurred');
          }
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    } else {
      // Mark all form controls as touched to show validation errors
      Object.values(this.registerForm.controls).forEach(control => {
        control.markAsTouched();
      });
    }
  }
}

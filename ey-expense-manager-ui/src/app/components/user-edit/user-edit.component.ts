import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Role, User, UserUpdate } from '../../models/user.model';
import { UserService } from '../../services/user.service';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './user-edit.component.html',
  styleUrls: ['./user-edit.component.scss']
})
export class UserEditComponent implements OnInit {
  editForm: FormGroup;
  roles: number[] = Object.values(Role).filter((v) => !isNaN(Number(v))) as number[];
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isSubmitting = false;
  isLoading = true;
  errorMessage = '';
  userId: number = 0;
  user: User | null = null;

  private roleNames: { [key: number]: string } = {
    [Role.Admin]: 'Admin',
    [Role.User]: 'User',
    [Role.Manager]: 'Manager',
    [Role.Associer]: 'Associer',
    [Role.Employe]: 'Employe'
  };

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.editForm = this.fb.group({
      idUser: ['', [Validators.required, Validators.maxLength(50)]],
      nameUser: ['', [Validators.required, Validators.maxLength(100)]],
      surname: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      password: ['', [
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{6,}$/)
      ]],
      role: [2, Validators.required], // Default to User role
      gpn: ['', Validators.maxLength(50)]
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.userId = +idParam;
      this.loadUserData(this.userId);
    } else {
      this.errorMessage = 'User ID is missing';
      this.isLoading = false;
    }
  }

  loadUserData(userId: number): void {
    this.isLoading = true;
    this.userService.getUserById(userId).subscribe({
      next: (user) => {
        this.user = user;
        
        // Add null check before accessing user properties
        if (user) {
          // Populate form with user data
          this.editForm.patchValue({
            idUser: user.idUser || '',
            nameUser: user.nameUser || '',
            surname: user.surname || '',
            email: user.email || '',
            role: user.role || Role.User, // Default to User role if null
            gpn: user.gpn || ''
          });
          
          // Handle profile image
          if (user.profileImageUrl) {
            this.imagePreview = user.profileImageUrl.startsWith('http') 
              ? user.profileImageUrl 
              : `${environment.apiUrl}/api/user/${user.id}/profile-image`;
          }
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user data:', error);
        this.errorMessage = 'Failed to load user data. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  getRoleName(role: number): string {
    return this.roleNames[role] || 'Unknown';
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

  onSubmit(): void {
    if (this.editForm.valid) {
      this.isSubmitting = true;

      // Create FormData object
      const formData = new FormData();

      // Only include password if it was changed (not empty)
      const formValues = { ...this.editForm.value };
      if (!formValues.password) {
        delete formValues.password;
      }

      // Add form values to FormData
      Object.keys(formValues).forEach(key => {
        if (formValues[key] !== null && formValues[key] !== undefined) {
          formData.append(key, formValues[key]);
        }
      });

      // Add profile image if selected
      if (this.selectedFile) {
        formData.append('profileImage', this.selectedFile);
      }

      this.userService.updateUser(this.userId, formData).subscribe({
        next: () => {
          console.log('User updated successfully');
          this.router.navigate(['/users', this.userId]);
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Error updating user', error);

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
              alert(`Error: ${error.error?.message || 'Update failed'}`);
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
      Object.values(this.editForm.controls).forEach(control => {
        control.markAsTouched();
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/users', this.userId]);
  }
}

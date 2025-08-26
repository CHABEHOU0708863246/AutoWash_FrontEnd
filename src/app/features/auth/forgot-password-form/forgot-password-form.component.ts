import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/Auth/auth.service';

@Component({
  selector: 'app-forgot-password-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password-form.component.html',
  styleUrl: './forgot-password-form.component.scss'
})
export class ForgotPasswordFormComponent {
  forgotPasswordForm: FormGroup;
  isLoading = false;
  emailSent = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const email = this.forgotPasswordForm.get('email')?.value;
      const redirectPath = `${window.location.origin}/reset-password`;

      this.authService.forgotPassword(email, redirectPath)
        .pipe(
          catchError(error => {
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Une erreur s\'est produite. Veuillez réessayer.';
            return throwError(error);
          })
        )
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            if (response.success) {
              this.emailSent = true;
              this.successMessage = response.message;

              // Rediriger après 5 secondes
              setTimeout(() => {
                this.router.navigate(['/auth/login']);
              }, 5000);
            } else {
              this.errorMessage = response.message;
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Une erreur s\'est produite. Veuillez réessayer.';
          }
        });
    } else {
      this.forgotPasswordForm.markAllAsTouched();
    }
  }

  goBackToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}

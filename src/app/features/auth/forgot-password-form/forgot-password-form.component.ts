import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { catchError, Subject, takeUntil, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/Auth/auth.service';

@Component({
  selector: 'app-forgot-password-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password-form.component.html',
  styleUrl: './forgot-password-form.component.scss'
})
export class ForgotPasswordFormComponent implements OnDestroy {
  forgotPasswordForm: FormGroup;
  isLoading = false;
  emailSent = false;
  errorMessage = '';
  successMessage = '';
  countdown = 0;
  private destroy$ = new Subject<void>();
  private countdownTimer?: any;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const email = this.forgotPasswordForm.get('email')?.value;
      const redirectPath = `${window.location.origin}/auth/reset-password`;

      this.authService.forgotPassword(email, redirectPath)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            this.handleError(error);
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            if (response.isSuccess) {
              this.handleSuccess(response.message);
            } else {
              this.errorMessage = response.message;
            }
          },
          error: () => {
            // Erreur déjà gérée dans catchError
          }
        });
    } else {
      this.forgotPasswordForm.markAllAsTouched();
    }
  }

  private handleSuccess(message: string): void {
    this.emailSent = true;
    this.successMessage = message;
    this.forgotPasswordForm.disable();

    // Démarrer le compte à rebours
    this.startCountdown(60); // 60 secondes avant de permettre un autre envoi
  }

  private handleError(error: any): void {
    this.isLoading = false;
    if (error.status === 0) {
      this.errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
    } else if (error.status >= 400 && error.status < 500) {
      this.errorMessage = error.error?.message || 'Données invalides.';
    } else if (error.status >= 500) {
      this.errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
    } else {
      this.errorMessage = 'Une erreur inattendue s\'est produite.';
    }
  }

  private startCountdown(seconds: number): void {
    this.countdown = seconds;
    this.countdownTimer = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownTimer);
        this.enableResend();
      }
    }, 1000);
  }

  private enableResend(): void {
    this.forgotPasswordForm.enable();
    this.emailSent = false;
  }

  resendEmail(): void {
    if (this.countdown <= 0) {
      this.onSubmit();
    }
  }

  goBackToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  // Getter pour faciliter l'accès au contrôle email dans le template
  get email() {
    return this.forgotPasswordForm.get('email');
  }
}

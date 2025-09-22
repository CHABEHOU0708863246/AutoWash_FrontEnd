import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormsModule, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, throwError, Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../core/services/Auth/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  resetPasswordForm: FormGroup;
  isLoading = false;
  isValidating = true;
  errorMessage = '';
  successMessage = '';
  hidePassword = true;
  hideConfirmPassword = true;
  email = '';
  token = '';
  tokenValid = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [
        Validators.required,
        Validators.minLength(6),
        this.passwordStrengthValidator
      ]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    // Récupérer les paramètres de l'URL
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.email = params['email'] || '';
      this.token = params['token'] || '';

      if (!this.email || !this.token) {
        this.errorMessage = 'Lien de réinitialisation invalide ou expiré.';
        this.isValidating = false;
        return;
      }

      this.validateToken();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private validateToken(): void {
    this.authService.validateResetToken(this.email, this.token)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.handleTokenValidationError(error);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.isValidating = false;
          if (response.status === 200) {
            this.tokenValid = true;
          } else {
            this.errorMessage = response.statusText || 'Token invalide ou expiré.';
          }
        },
        error: () => {
          // Erreur déjà gérée dans catchError
        }
      });
  }

  private handleTokenValidationError(error: any): void {
    this.isValidating = false;
    this.tokenValid = false;

    if (error.status === 0) {
      this.errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
    } else if (error.status === 400 || error.status === 404) {
      this.errorMessage = 'Lien de réinitialisation invalide ou expiré.';
    } else {
      this.errorMessage = 'Erreur lors de la validation du token.';
    }
  }

  onSubmit(): void {
    if (this.resetPasswordForm.valid && !this.isLoading && this.tokenValid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const { newPassword, confirmPassword } = this.resetPasswordForm.value;

      this.authService.resetPassword(this.email, this.token, newPassword,)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            this.handleResetError(error);
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            if (response.isSuccess) {
              this.handleResetSuccess(response.message);
            } else {
              this.errorMessage = response.message;
            }
          },
          error: () => {
            // Erreur déjà gérée dans catchError
          }
        });
    } else {
      this.resetPasswordForm.markAllAsTouched();
    }
  }

  private handleResetSuccess(message: string): void {
    this.successMessage = message;
    this.resetPasswordForm.disable();

    // Rediriger vers la page de connexion après 3 secondes
    setTimeout(() => {
      this.router.navigate(['/auth/login'], {
        queryParams: { message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.' }
      });
    }, 3000);
  }

  private handleResetError(error: any): void {
    this.isLoading = false;

    if (error.status === 0) {
      this.errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
    } else if (error.status === 400) {
      this.errorMessage = error.error?.message || 'Données invalides.';
    } else if (error.status === 404) {
      this.errorMessage = 'Token invalide ou expiré.';
    } else {
      this.errorMessage = 'Erreur lors de la réinitialisation du mot de passe.';
    }
  }

  // Validateurs personnalisés
  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;

    if (!value) {
      return null;
    }

    const hasNumber = /[0-9]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasSpecial = /[#?!@$%^&*-]/.test(value);

    const passwordValid = hasNumber && hasUpper && hasLower && value.length >= 6;

    return passwordValid ? null : {
      passwordStrength: {
        hasNumber,
        hasUpper,
        hasLower,
        hasSpecial,
        minLength: value.length >= 6
      }
    };
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  goBackToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  requestNewResetLink(): void {
    this.router.navigate(['/auth/forgot-password']);
  }

  // Getters pour faciliter l'accès aux contrôles dans le template
  get newPassword() {
    return this.resetPasswordForm.get('newPassword');
  }

  get confirmPassword() {
    return this.resetPasswordForm.get('confirmPassword');
  }

  getPasswordStrengthErrors() {
    return this.newPassword?.errors?.['passwordStrength'] || {};
  }

  get hasPasswordMismatch(): boolean {
    return this.resetPasswordForm.errors?.['passwordMismatch'] &&
           this.confirmPassword?.touched === true;
  }
}

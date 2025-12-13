import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { NotificationService } from '../../../core/services/Notification/notification.service'; // Import ajouté

@Component({
    selector: 'app-login',
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule
    ],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [true]
    });
  }

  goToForgotPassword(): void {
    this.router.navigate(['/auth/forgot-password']);
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { email, password, rememberMe } = this.loginForm.value;

      this.authService.login(email, password).subscribe({
        next: (response) => {
          this.isLoading = false;

          if (response && response.token) {
            // Si rememberMe est coché, stocker cette préférence
            if (rememberMe) {
              // Implémentez la connexion persistante ici
            }

            // Récupère le rôle de l'utilisateur
            const userRole = this.authService.getUserRole();

            // Notification de succès
            this.notificationService.success(
              'Connexion réussie',
              `Bienvenue ! Redirection vers votre tableau de bord...`
            );

            // Redirige selon le rôle
            this.redirectBasedOnRole(userRole);
          } else {
            // Notification d'erreur si le token est absent
            this.notificationService.error(
              'Échec de la connexion',
              'Identifiants incorrects ou token manquant'
            );
          }
        },
        error: (err) => {
          this.isLoading = false;

          // Gestion des erreurs spécifiques
          let errorTitle = 'Erreur de connexion';
          let errorMessage = 'Une erreur est survenue lors de la connexion.';

          if (err.status === 401) {
            errorTitle = 'Identifiants invalides';
            errorMessage = 'L\'email ou le mot de passe est incorrect.';
          } else if (err.status === 500) {
            errorTitle = 'Problème de connexion';
            errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
          } else if (err.status >= 500) {
            errorTitle = 'Erreur serveur';
            errorMessage = 'Le serveur rencontre des difficultés. Veuillez réessayer plus tard.';
          }

          // Notification d'erreur
          this.notificationService.error(errorTitle, errorMessage);

          console.error('Login error:', err);
        }
      });
    } else {
      // Marque tous les champs comme touchés pour afficher les messages de validation
      this.loginForm.markAllAsTouched();

      // Notification d'avertissement pour le formulaire invalide
      this.notificationService.warning(
        'Formulaire incomplet',
        'Veuillez corriger les erreurs dans le formulaire avant de continuer.'
      );
    }
  }

  /**
   * Redirige l'utilisateur vers le tableau de bord correspondant à son rôle.
   * @param role Rôle de l'utilisateur (admin, manager, etc.)
   */
  private redirectBasedOnRole(role: string | null): void {
    if (!role) {
      this.notificationService.error(
        'Rôle non défini',
        'Impossible de déterminer votre rôle. Veuillez contacter l\'administrateur.'
      );
      this.router.navigate(['/auth/login']);
      return;
    }

    // Dictionnaire des routes par rôle
    const roleRoutes: Record<string, string> = {
      'admin': '/admin/dashboard',
      'manager': '/manager/dashboard',
      'washer': '/washer/dashboard',
      'default': '/'
    };

    const route = roleRoutes[role.toLowerCase()] || roleRoutes['default'];

    // Navigation avec délai pour permettre à l'utilisateur de voir la notification
    setTimeout(() => {
      this.router.navigate([route]).catch(err => {
        console.error('Navigation error:', err);
        this.notificationService.error(
          'Erreur de navigation',
          'Impossible d\'accéder au tableau de bord. Redirection vers la page d\'accueil.'
        );
        this.router.navigate(['/']);
      });
    }, 1000);
  }
}

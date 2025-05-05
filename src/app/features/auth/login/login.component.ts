import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/Auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  // Données du formulaire de connexion
  loginData = {
    email: '',
    password: '',
    rememberMe: false
  };

  // Indique si une requête de connexion est en cours
  isLoading = false;

  // Contrôle l'affichage du mot de passe
  hidePassword = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  /**
   * Gère la soumission du formulaire de connexion.
   * Envoie les identifiants à AuthService et redirige en fonction du rôle de l'utilisateur.
   */
  onSubmit(): void {
    this.isLoading = true;

    this.authService.login(this.loginData.email, this.loginData.password).subscribe({
      next: (response) => {
        this.isLoading = false;

        if (response && response.token) {
          // Récupère le rôle de l'utilisateur depuis le service d'authentification
          const userRole = this.authService.getUserRole();

          // Redirige selon le rôle
          this.redirectBasedOnRole(userRole);
        } else {
          // Affiche une erreur si le token est absent
          this.showError('Identifiants incorrects');
        }
      },
      error: (err) => {
        this.isLoading = false;
        // Affiche un message d'erreur en cas de problème réseau ou serveur
        this.showError('Erreur de connexion. Veuillez réessayer.');
        console.error('Login error:', err);
      }
    });
  }

  /**
   * Redirige l'utilisateur vers le tableau de bord correspondant à son rôle.
   * @param role Rôle de l'utilisateur (admin, manager, etc.)
   */
  private redirectBasedOnRole(role: string | null): void {
    if (!role) {
      this.showError('Rôle utilisateur non défini');
      this.router.navigate(['/auth/login']);
      return;
    }

    // Dictionnaire des routes par rôle
    const roleRoutes: Record<string, string> = {
      'admin': '/admin/dashboard',
      'manager': '/manager/dashboard',
      'employee': '/employee/dashboard',
      'client': '/client/dashboard'
    };

    const route = roleRoutes[role.toLowerCase()] || '/';

    // Navigation sécurisée avec fallback sur la page d'accueil
    this.router.navigate([route]).catch(err => {
      console.error('Navigation error:', err);
      this.router.navigate(['/']);
    });
  }

  /**
   * Affiche un message d'erreur dans une snackbar.
   * @param message Message à afficher
   */
  private showError(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}

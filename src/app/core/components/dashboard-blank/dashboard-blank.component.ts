import { Component } from '@angular/core';
import { Router } from 'express';
import { AuthService } from '../../services/Auth/auth.service';
import { UsersService } from '../../services/Users/users.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard-blank',
  imports: [RouterLink],
  templateUrl: './dashboard-blank.component.html',
  styleUrl: './dashboard-blank.component.scss'
})
export class DashboardBlankComponent {


  constructor(
    private router: Router, // Service pour la navigation entre les routes.
    private usersService: UsersService, // Service pour interagir avec les utilisateurs.
    private authService: AuthService // Service pour gérer l'authentification.
  ) {}

    /**
   * Déconnecte l'utilisateur et le redirige vers la page de connexion.
   */
  logout(): void {
    // Vérifie si l'utilisateur est bien authentifié avant de le déconnecter
    if (this.authService.isAuthenticated()) {
      try {
        // Log l'état du localStorage avant la déconnexion (pour debug)
        console.log('État du localStorage avant déconnexion:', {
          token: !!this.authService.getToken(),
          userRole: localStorage.getItem('userRole'),
          profile: localStorage.getItem('currentUserProfile')
        });

        // Appel au service de déconnexion
        this.authService.logout();

        // Vérifie que le localStorage a bien été vidé
        console.log('État du localStorage après déconnexion:', {
          token: !!this.authService.getToken(),
          userRole: localStorage.getItem('userRole'),
          profile: localStorage.getItem('currentUserProfile')
        });

        // Redirige vers la page de login seulement après confirmation que tout est bien déconnecté
        //this.router.navigate(['/auth/login']);
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        // Fallback en cas d'erreur - force la redirection
        //this.router.navigate(['/auth/login']);
      }
    } else {
      // Si l'utilisateur n'est pas authentifié, rediriger directement
      //this.router.navigate(['/auth/login']);
    }
  }
}

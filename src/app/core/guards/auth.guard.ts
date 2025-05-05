import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { TokenService } from '../services/Token/token.service';
import { AuthService } from '../services/Auth/auth.service';

/**
 * `authGuard` : Fonction de garde pour protéger les routes en fonction de l'authentification et des rôles.
 *
 * Cette garde vérifie si l'utilisateur est authentifié, si son token n'est pas expiré,
 * et s'il possède les rôles requis pour accéder à une route spécifique.
 *
 * @param route - Informations sur la route à laquelle l'utilisateur tente d'accéder.
 * @param state - L'état de navigation actuel (non utilisé ici mais disponible).
 * @returns `true` si l'utilisateur est autorisé, sinon une URL pour rediriger l'utilisateur.
 */
export const authGuard: CanActivateFn = (route, state) => {
  // Injection des services nécessaires
  const authService = inject(AuthService); // Service pour gérer l'authentification
  const tokenService = inject(TokenService); // Service pour gérer les tokens
  const router = inject(Router); // Service pour gérer la navigation

  // Vérifie si l'utilisateur est authentifié et si le token est valide
  if (authService.isAuthenticated() && !tokenService.isTokenExpired()) {
    // Récupère les rôles requis pour la route actuelle
    const requiredRoles = route.data['requiredRoles'] as string[];
    // Récupère le rôle de l'utilisateur actuel
    const userRole = authService.getUserRole();

    // Vérifie si l'utilisateur a le rôle requis
    if (userRole !== null && hasRequiredRole(userRole, requiredRoles)) {
      return true; // Accès autorisé
    } else {
      return router.parseUrl('/access-denied'); // Redirection vers une page de refus d'accès
    }
  } else {
    // Si l'utilisateur n'est pas authentifié ou si le token a expiré
    authService.logout(); // Déconnecte l'utilisateur
    return router.parseUrl('/auth/login'); // Redirection vers la page de connexion
  }
};

/**
 * Vérifie si l'utilisateur possède un des rôles requis.
 *
 * @param userRole - Le rôle de l'utilisateur.
 * @param requiredRoles - Les rôles requis pour accéder à la route.
 * @returns `true` si l'utilisateur possède un des rôles requis, `false` sinon.
 */
const hasRequiredRole = (userRole: string, requiredRoles: string[]): boolean => {
  return requiredRoles.includes(userRole);
};

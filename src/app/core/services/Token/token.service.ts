import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class TokenService {

  private tokenKey = 'VGhpcyBpcyBhIG5pY2Ugc3VjY2Vzc2Z1bCB0aGF0IHNhaWQgb3V0IG15IGpldG9u';

  constructor(private router: Router) {}

  /**
   * 1. Sauvegarde du token et de son rôle dans le localStorage.
   * @param token - Le token JWT.
   * @param role - Le rôle de l'utilisateur.
   */
  saveToken(token: string, role: string): void {
    const tokenData = { token, role }; // Crée un objet avec le token et le rôle.
    localStorage.setItem(this.tokenKey, JSON.stringify(tokenData)); // Sauvegarde l'objet dans le localStorage.
  }

  /**
   * 2. Vérifie si l'utilisateur est connecté (token présent dans localStorage).
   * @returns True si un token existe, sinon False.
   */
  isLogged(): boolean {
    const token = localStorage.getItem(this.tokenKey); // Récupère le token depuis le localStorage.
    return !!token; // Si le token existe, l'utilisateur est connecté.
  }

  /**
   * 3. Supprime le token du localStorage et redirige vers la page d'accueil.
   */
  clearToken(): void {
    localStorage.removeItem(this.tokenKey); // Supprime le token.
    this.router.navigate(['/']); // Redirige l'utilisateur vers la page d'accueil.
  }

  /**
   * 4. Supprime le token expiré et redirige vers la page d'authentification.
   */
  clearTokenExpired(): void {
    localStorage.removeItem(this.tokenKey); // Supprime le token expiré.
    this.router.navigate(['auth']); // Redirige vers la page d'authentification.
  }

  /**
   * 5. Vérifie si le token est expiré.
   * @returns True si le token est expiré, sinon False.
   */
  isTokenExpired(): boolean {
    const token = this.getToken(); // Récupère le token.
    if (!token) return true; // Si le token n'existe pas, il est expiré.

    const decodedToken: any = jwtDecode(token); // Décode le token JWT.
    const currentTime = Date.now() / 1000; // Récupère l'heure actuelle en secondes.
    return decodedToken.exp < currentTime; // Compare la date d'expiration du token avec l'heure actuelle.
  }

  /**
   * 6. Récupère le token depuis le localStorage.
   * @returns Le token JWT ou null si aucun token n'est trouvé.
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey); // Récupère le token.
  }

  /**
   * 7. Récupère les informations de la payload du token (par exemple, l'ID utilisateur, le rôle).
   * @returns Les données de la payload ou null si le token n'est pas présent.
   */
  getPayload(): AuthenticatorResponse | null {
    let userTokenInfo: AuthenticatorResponse | null = null;
    const token = this.getToken(); // Récupère le token.

    if (token != null) {
      userTokenInfo = JSON.parse(atob(token.split('.')[1])); // Décode la payload du token (partie entre les deux premiers points).
    }

    return userTokenInfo; // Retourne les informations de la payload.
  }
}

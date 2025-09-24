import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap, catchError, of, BehaviorSubject } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { Users } from '../../models/Users/Users';
import { ChangePasswordRequest } from '../../models/Password/ChangePasswordRequest';
import { ForgotPasswordRequest } from '../../models/Password/ForgotPasswordRequest';
import { ResetPasswordRequest } from '../../models/Password/ResetPasswordRequest';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'https://localhost:7139/api/Auth';
  private loginApiUrl = `${this.apiUrl}/login`;

  // Clé utilisée pour stocker le token dans le localStorage
  private tokenKey = 'VGhpcyBpcyBhIG5pY2Ugc3VjY2Vzc2Z1bCB0aGF0IHNhaWQgb3V0IG15IGpldG9u';

  // Subject pour gérer l'état de l'utilisateur courant
  private currentUserSubject = new BehaviorSubject<Users | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Charger l'utilisateur depuis le cache au démarrage (seulement côté client)
    if (this.isBrowser()) {
      this.loadUserFromCache();
    }
  }

  /**
   * Vérifie si on est côté navigateur (pas SSR)
   */
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /**
   * Accès sécurisé au localStorage
   */
  private getFromStorage(key: string): string | null {
    if (this.isBrowser()) {
      return localStorage.getItem(key);
    }
    return null;
  }

  /**
   * Écriture sécurisée dans le localStorage
   */
  private setInStorage(key: string, value: string): void {
    if (this.isBrowser()) {
      localStorage.setItem(key, value);
    }
  }

  /**
   * Suppression sécurisée du localStorage
   */
  private removeFromStorage(key: string): void {
    if (this.isBrowser()) {
      localStorage.removeItem(key);
    }
  }

  /**
   * Effectue la connexion d'un utilisateur.
   * @param email - Adresse e-mail de l'utilisateur.
   * @param password - Mot de passe de l'utilisateur.
   * @returns Observable contenant la réponse de l'API.
   */
  login(email: string, password: string): Observable<any> {
    // Utilisation du bon endpoint pour le login
    return this.http.post<any>(this.loginApiUrl, { email, password }).pipe(
      tap(response => {
        if (response && response.token) {
          // Stocker le token JWT dans le localStorage
          this.setInStorage(this.tokenKey, response.token);

          // Décoder le token pour récupérer le rôle utilisateur
          const decodedToken = this.decodeToken(response.token);
          if (decodedToken && decodedToken.role) {
            this.setInStorage('userRole', decodedToken.role);
          }

          // Charger le profil utilisateur après connexion réussie
          this.getCurrentUserProfile().subscribe();
        }
      }),
      catchError((error) => {
        console.error('Erreur lors de la connexion:', error);
        return of(null); // Retourne une Observable nulle en cas d'erreur
      })
    );
  }

  /**
   * Récupère l'utilisateur depuis le cache local ou fait un appel API si nécessaire
   * @param forceRefresh - Force un appel à l'API même si les données sont en cache
   * @returns Observable contenant les informations de l'utilisateur
   */
  loadCurrentUserProfile(forceRefresh: boolean = false): Observable<Users | null> {
    // Si on force le refresh ou qu'on n'a pas de données en cache
    if (forceRefresh || !this.currentUserSubject.value) {
      const cachedProfile = this.getFromStorage('currentUserProfile');

      // Si on a des données en cache et qu'on ne force pas le refresh
      if (cachedProfile && !forceRefresh) {
        try {
          const user = JSON.parse(cachedProfile);
          this.currentUserSubject.next(user);
          return of(user);
        } catch (error) {
          console.error('Erreur parsing cache profile:', error);
          this.removeFromStorage('currentUserProfile');
        }
      }

      // Sinon, on fait un appel API
      return this.getCurrentUserProfile();
    }

    // On a déjà les données dans le BehaviorSubject
    return of(this.currentUserSubject.value);
  }

  /**
   * Charge l'utilisateur depuis le cache au démarrage de l'application
   */
  private loadUserFromCache(): void {
    const cachedProfile = this.getFromStorage('currentUserProfile');
    if (cachedProfile && this.isAuthenticated()) {
      try {
        const user = JSON.parse(cachedProfile);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Erreur lors du chargement du profil depuis le cache:', error);
        this.removeFromStorage('currentUserProfile');
      }
    }
  }

  /**
   * Récupère l'utilisateur actuellement connecté depuis l'API
   * Cette méthode fait toujours un appel à l'API pour avoir les données les plus récentes
   * @returns Observable contenant les informations de l'utilisateur ou null en cas d'erreur
   */
  getCurrentUserProfile(): Observable<Users | null> {
    const token = this.getToken();
    if (!token) {
      console.warn('Aucun token trouvé pour récupérer le profil utilisateur');
      this.currentUserSubject.next(null);
      return of(null);
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.get<Users>(`${this.apiUrl}/me`, { headers }).pipe(
      tap(user => {
        if (user) {
          // Mise à jour du cache et du BehaviorSubject
          this.setInStorage('currentUserProfile', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération du profil:', error);

        // Si erreur 401, le token est probablement expiré
        if (error.status === 401) {
          this.logout();
        } else {
          // Pour les autres erreurs, on met null dans le subject
          this.currentUserSubject.next(null);
        }

        return of(null);
      })
    );
  }

  /**
   * Récupère le rôle de l'utilisateur connecté.
   * @returns Rôle de l'utilisateur ou null si aucun rôle n'est défini.
   */
  getUserRole(): string | null {
    const token = this.getToken();
    if (token) {
      try {
        const decodedToken: any = this.decodeToken(token);
        const roleKey = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
        return decodedToken[roleKey] || this.getFromStorage('userRole');
      } catch (error) {
        console.error('Erreur lors du décodage du token:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Déconnecte l'utilisateur.
   * Supprime les données de session stockées localement.
   */
  logout(): void {
    // Nettoyer le localStorage
    this.removeFromStorage(this.tokenKey);
    this.removeFromStorage('userRole');
    this.removeFromStorage('currentUserProfile');

    // Mettre à jour le BehaviorSubject
    this.currentUserSubject.next(null);
  }

  /**
   * Récupère le token JWT stocké localement.
   * @returns Token JWT ou null s'il n'est pas trouvé.
   */
  getToken(): string | null {
    return this.getFromStorage(this.tokenKey);
  }

  /**
   * Vérifie si l'utilisateur est authentifié.
   * @returns True si le token est valide et non expiré, sinon false.
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decodedToken: any = this.decodeToken(token);
      const currentTime = Date.now() / 1000; // Temps actuel en secondes

      // Vérifier si le token n'est pas expiré
      if (decodedToken.exp && decodedToken.exp <= currentTime) {
        // Token expiré, nettoyer automatiquement
        this.logout();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la vérification du token:', error);
      this.logout(); // Nettoyer en cas d'erreur
      return false;
    }
  }

  /**
   * Décodage d'un token JWT.
   * @param token - Token JWT à décoder.
   * @returns Données décodées ou null en cas d'erreur.
   */
  decodeToken(token: string): any {
    try {
      const decoded = jwtDecode(token);
      return decoded;
    } catch (error) {
      console.error('Erreur lors du décodage du token:', error);
      return null;
    }
  }

  /**
   * Envoie une demande pour réinitialiser le mot de passe.
   * @param email - Adresse e-mail de l'utilisateur.
   * @param redirectPath - Chemin de redirection après la demande.
   * @returns Observable avec la réponse de l'API.
   */
  forgotPassword(email: string, redirectPath: string): Observable<any> {
    const request: ForgotPasswordRequest = new ForgotPasswordRequest(email, redirectPath);
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, request);
  }

  /**
 * Réinitialise le mot de passe de l'utilisateur.
 * @param email - Adresse e-mail de l'utilisateur.
 * @param token - Token de réinitialisation.
 * @param password - Nouveau mot de passe.
 * @returns Observable avec la réponse de l'API.
 */
resetPassword(email: string, token: string, password: string): Observable<any> {
  const decodedToken = decodeURIComponent(token);
  const request: ResetPasswordRequest = new ResetPasswordRequest(email, decodedToken, password);
  return this.http.post<any>(`${this.apiUrl}/reset-password`, request);
}

  /**
 * Valide un token de réinitialisation de mot de passe
 * @param email - Email de l'utilisateur
 * @param token - Token à valider
 * @returns Observable<any> - Correction du type de retour
 */
validateResetToken(email: string, token: string): Observable<any> {
  // Décoder le token avant l'envoi
  const decodedToken = decodeURIComponent(token);
  const request = {
    email: email,
    token: decodedToken
  };

  console.log('Validation token - Email:', email);
  console.log('Validation token - Token length:', decodedToken.length);

  return this.http.post<any>(`${this.apiUrl}/validate-reset-token`, request);
}



  /**
   * Change le mot de passe de l'utilisateur.
   * @param oldPassword - Ancien mot de passe.
   * @param newPassword - Nouveau mot de passe.
   * @returns Observable contenant la réponse de l'API.
   */
  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    const token = this.getToken();
    if (!token) {
      return of({ success: false, message: 'Non authentifié' });
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const request: ChangePasswordRequest = new ChangePasswordRequest(oldPassword, newPassword);

    return this.http.post<any>(
      `${this.apiUrl}/change-password`,
      request,
      { headers }
    ).pipe(
      catchError(error => {
        console.error('Erreur lors du changement de mot de passe:', error);
        return of({ success: false, message: 'Erreur lors du changement de mot de passe' });
      })
    );
  }

  /**
   * Met à jour les informations de l'utilisateur courant dans le localStorage
   * @param user - Les nouvelles informations de l'utilisateur
   */
  updateCurrentUser(user: Users): void {
    if (this.getToken() && user) {
      this.setInStorage('currentUserProfile', JSON.stringify(user));
      this.currentUserSubject.next(user);
    }
  }

  /**
   * Force la mise à jour du profil utilisateur depuis le serveur
   */
  refreshUserProfile(): Observable<Users | null> {
    // On efface le cache avant de rafraîchir
    this.removeFromStorage('currentUserProfile');
    return this.getCurrentUserProfile();
  }

  /**
   * Méthode utilitaire pour vérifier si un utilisateur a un rôle spécifique
   * @param role - Le rôle à vérifier
   * @returns True si l'utilisateur a ce rôle
   */
  hasRole(role: string): boolean {
    const userRole = this.getUserRole();
    return userRole === role;
  }

  /**
   * Méthode utilitaire pour vérifier si un utilisateur a l'un des rôles spécifiés
   * @param roles - Liste des rôles à vérifier
   * @returns True si l'utilisateur a au moins un des rôles
   */
  hasAnyRole(roles: string[]): boolean {
    const userRole = this.getUserRole();
    return userRole ? roles.includes(userRole) : false;
  }
}

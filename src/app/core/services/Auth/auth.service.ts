import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap, catchError, of, BehaviorSubject } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { Users } from '../../models/Users/Users';
import { ChangePasswordRequest } from '../../models/Password/ChangePasswordRequest';
import { ForgotPasswordRequest } from '../../models/Password/ForgotPasswordRequest';
import { ResetPasswordRequest } from '../../models/Password/ResetPasswordRequest';
import { environment } from '../../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${environment.apiUrl}/api/Auth`;
  private loginApiUrl = `${this.apiUrl}/login`;

  // Clé sécurisée pour le stockage (générée dynamiquement)
  private get tokenKey(): string {
    return this.generateSecureStorageKey('auth_token');
  }

  private get userRoleKey(): string {
    return this.generateSecureStorageKey('user_role');
  }

  private get userProfileKey(): string {
    return this.generateSecureStorageKey('user_profile');
  }

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
   * Génère une clé de stockage sécurisée
   */
  private generateSecureStorageKey(baseKey: string): string {
    const appPrefix = 'app_secure_';
    const envSuffix = environment.production ? 'prod' : 'dev';
    return `${appPrefix}${baseKey}_${envSuffix}`;
  }

  /**
   * Vérifie si on est côté navigateur (pas SSR)
   */
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /**
   * Accès sécurisé au localStorage avec validation
   */
  private getFromStorage(key: string): string | null {
    if (!this.isBrowser()) return null;

    try {
      const item = localStorage.getItem(key);
      return item && this.isValidStorageData(item) ? item : null;
    } catch (error) {
      console.error('Erreur accès localStorage:', error);
      return null;
    }
  }

  /**
   * Validation des données du localStorage
   */
  private isValidStorageData(data: string): boolean {
    try {
      // Vérifie que ce n'est pas une chaîne corrompue ou malformée
      if (typeof data !== 'string' || data.length > 5000) return false;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Écriture sécurisée dans le localStorage
   */
  private setInStorage(key: string, value: string): void {
    if (!this.isBrowser()) return;

    try {
      if (this.isValidStorageData(value)) {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Erreur écriture localStorage:', error);
    }
  }

  /**
   * Suppression sécurisée du localStorage
   */
  private removeFromStorage(key: string): void {
    if (!this.isBrowser()) return;

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Erreur suppression localStorage:', error);
    }
  }

  /**
   * Nettoyage complet des données d'authentification
   */
  private clearAuthStorage(): void {
    this.removeFromStorage(this.tokenKey);
    this.removeFromStorage(this.userRoleKey);
    this.removeFromStorage(this.userProfileKey);
  }

  /**
   * Effectue la connexion d'un utilisateur.
   * @param email - Adresse e-mail de l'utilisateur.
   * @param password - Mot de passe de l'utilisateur.
   * @returns Observable contenant la réponse de l'API.
   */
  login(email: string, password: string): Observable<any> {
    // Validation des entrées
    if (!email || !password) {
      return of({ success: false, message: 'Email et mot de passe requis' });
    }

    return this.http.post<any>(this.loginApiUrl, { email, password }).pipe(
      tap(response => {
        if (response && response.token) {
          // Validation du token avant stockage
          if (this.isValidToken(response.token)) {
            // Stocker le token JWT dans le localStorage
            this.setInStorage(this.tokenKey, response.token);

            // Décoder le token pour récupérer le rôle utilisateur
            const decodedToken = this.decodeToken(response.token);
            if (decodedToken && decodedToken.role) {
              this.setInStorage(this.userRoleKey, decodedToken.role);
            }

            // Charger le profil utilisateur après connexion réussie
            this.getCurrentUserProfile().subscribe();
          } else {
            throw new Error('Token JWT invalide');
          }
        }
      }),
      catchError((error) => {
        console.error('Erreur lors de la connexion:', error);
        // Ne pas exposer les détails de l'erreur à l'utilisateur
        return of({ success: false, message: 'Erreur d\'authentification' });
      })
    );
  }

  /**
   * Vérifie la validité basique d'un token JWT
   */
  private isValidToken(token: string): boolean {
    if (!token || typeof token !== 'string') return false;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      const decoded = this.decodeToken(token);
      return decoded && typeof decoded === 'object';
    } catch {
      return false;
    }
  }

  /**
   * Récupère l'utilisateur depuis le cache local ou fait un appel API si nécessaire
   * @param forceRefresh - Force un appel à l'API même si les données sont en cache
   * @returns Observable contenant les informations de l'utilisateur
   */
  loadCurrentUserProfile(forceRefresh: boolean = false): Observable<Users | null> {
    // Si on force le refresh ou qu'on n'a pas de données en cache
    if (forceRefresh || !this.currentUserSubject.value) {
      const cachedProfile = this.getFromStorage(this.userProfileKey);

      // Si on a des données en cache et qu'on ne force pas le refresh
      if (cachedProfile && !forceRefresh) {
        try {
          const user = JSON.parse(cachedProfile);
          // Validation des données utilisateur
          if (this.isValidUserData(user)) {
            this.currentUserSubject.next(user);
            return of(user);
          } else {
            this.removeFromStorage(this.userProfileKey);
          }
        } catch (error) {
          console.error('Erreur parsing cache profile:', error);
          this.removeFromStorage(this.userProfileKey);
        }
      }

      // Sinon, on fait un appel API
      return this.getCurrentUserProfile();
    }

    // On a déjà les données dans le BehaviorSubject
    return of(this.currentUserSubject.value);
  }

  /**
   * Validation des données utilisateur
   */
  private isValidUserData(user: any): user is Users {
    return user && typeof user === 'object' && user.id !== undefined;
  }

  /**
   * Charge l'utilisateur depuis le cache au démarrage de l'application
   */
  private loadUserFromCache(): void {
    const cachedProfile = this.getFromStorage(this.userProfileKey);
    if (cachedProfile && this.isAuthenticated()) {
      try {
        const user = JSON.parse(cachedProfile);
        if (this.isValidUserData(user)) {
          this.currentUserSubject.next(user);
        } else {
          this.removeFromStorage(this.userProfileKey);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil depuis le cache:', error);
        this.removeFromStorage(this.userProfileKey);
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
        if (user && this.isValidUserData(user)) {
          // Mise à jour du cache et du BehaviorSubject
          this.setInStorage(this.userProfileKey, JSON.stringify(user));
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
        return decodedToken[roleKey] || this.getFromStorage(this.userRoleKey);
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
    // Nettoyer le localStorage de manière sécurisée
    this.clearAuthStorage();

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
    // Validation de l'email
    if (!email || !this.isValidEmail(email)) {
      return of({ success: false, message: 'Email invalide' });
    }

    const request: ForgotPasswordRequest = new ForgotPasswordRequest(email, redirectPath);
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, request);
  }

  /**
   * Validation basique d'email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Réinitialise le mot de passe de l'utilisateur.
   * @param email - Adresse e-mail de l'utilisateur.
   * @param token - Token de réinitialisation.
   * @param password - Nouveau mot de passe.
   * @returns Observable avec la réponse de l'API.
   */
  resetPassword(email: string, token: string, password: string): Observable<any> {
    // Validation des entrées
    if (!email || !token || !password) {
      return of({ success: false, message: 'Tous les champs sont requis' });
    }

    if (password.length < 8) {
      return of({ success: false, message: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    const request: ResetPasswordRequest = new ResetPasswordRequest(email, token, password);
    return this.http.post<any>(`${this.apiUrl}/reset-password`, request);
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

    // Validation des mots de passe
    if (!oldPassword || !newPassword) {
      return of({ success: false, message: 'Les mots de passe sont requis' });
    }

    if (newPassword.length < 8) {
      return of({ success: false, message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });
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
    if (this.getToken() && user && this.isValidUserData(user)) {
      this.setInStorage(this.userProfileKey, JSON.stringify(user));
      this.currentUserSubject.next(user);
    }
  }

  /**
   * Force la mise à jour du profil utilisateur depuis le serveur
   */
  refreshUserProfile(): Observable<Users | null> {
    // On efface le cache avant de rafraîchir
    this.removeFromStorage(this.userProfileKey);
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

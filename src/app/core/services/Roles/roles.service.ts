import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject, Observable, catchError, tap, throwError, firstValueFrom } from 'rxjs';
import { Roles } from '../../models/Roles/Roles';

@Injectable({
  providedIn: 'root'
})
export class RolesService {

  private apiUrl = 'https://localhost:7139/api/Roles';
  private roleUpdatedSubject = new Subject<void>();
  private rolesCache: Roles[] = [];
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient) { }

  /**
   * Cache les rôles pour éviter les appels répétés
   * Version corrigée avec firstValueFrom
   */
  async loadRoles(): Promise<void> {
    const now = Date.now();

    if (this.rolesCache.length === 0 || now > this.cacheExpiry) {
      try {
        // Utilisation de firstValueFrom au lieu de toPromise()
        this.rolesCache = await firstValueFrom(this.getRoles());
        this.cacheExpiry = now + this.CACHE_DURATION;
      } catch (error) {
        console.error('Erreur lors du chargement des rôles:', error);
        // En cas d'erreur, on garde le cache existant s'il y en a un
        if (this.rolesCache.length === 0) {
          this.rolesCache = []; // S'assurer que c'est un tableau vide
        }
        throw error;
      }
    }
  }

  /**
   * Méthode pour vérifier si un utilisateur est admin par code
   */
  async isUserAdmin(userRoleIds: string[]): Promise<boolean> {
    if (!userRoleIds || userRoleIds.length === 0) {
      return false;
    }

    try {
      await this.loadRoles();

      const adminRole = this.rolesCache.find(role =>
        role.code?.toLowerCase() === 'admin' ||
        role.roleName?.toLowerCase() === 'admin'
      );

      return adminRole ? userRoleIds.includes(adminRole.id) : false;
    } catch (error) {
      console.error('Erreur lors de la vérification du rôle admin:', error);
      return false;
    }
  }

  /**
   * Méthode générique pour vérifier n'importe quel rôle
   */
  async hasRole(userRoleIds: string[], roleCode: string): Promise<boolean> {
    if (!userRoleIds || userRoleIds.length === 0 || !roleCode) {
      return false;
    }

    try {
      await this.loadRoles();

      const role = this.rolesCache.find(r =>
        r.code?.toLowerCase() === roleCode.toLowerCase()
      );

      return role ? userRoleIds.includes(role.id) : false;
    } catch (error) {
      console.error(`Erreur lors de la vérification du rôle ${roleCode}:`, error);
      return false;
    }
  }

  /**
   * Obtenir les noms des rôles à partir des IDs
   */
  async getRoleNames(roleIds: string[]): Promise<string[]> {
    if (!roleIds || roleIds.length === 0) {
      return [];
    }

    try {
      await this.loadRoles();

      return this.rolesCache
        .filter(role => roleIds.includes(role.id))
        .map(role => role.roleName || role.code || 'Unknown');
    } catch (error) {
      console.error('Erreur lors de la récupération des noms de rôles:', error);
      return [];
    }
  }

  /**
   * Obtenir un rôle par son code
   */
  async getRoleByCode(code: string): Promise<Roles | null> {
    if (!code) {
      return null;
    }

    try {
      await this.loadRoles();

      return this.rolesCache.find(role =>
        role.code?.toLowerCase() === code.toLowerCase()
      ) || null;
    } catch (error) {
      console.error(`Erreur lors de la recherche du rôle ${code}:`, error);
      return null;
    }
  }

  /**
   * Vider le cache (utile après modification des rôles)
   */
  clearCache(): void {
    this.rolesCache = [];
    this.cacheExpiry = 0;
  }

  /**
   * 1. Récupère tous les rôles.
   * Utilise une requête GET pour obtenir une liste de rôles.
   * @returns Observable contenant un tableau d'objets RoleRequest.
   */
  getRoles(): Observable<Roles[]> {
    return this.http.get<Roles[]>(this.apiUrl).pipe(
      catchError(this.handleError) // Gère les erreurs potentielles.
    );
  }

  /**
   * 2. Récupère un rôle spécifique par son ID.
   * @param roleId - L'identifiant du rôle.
   * @returns Observable contenant les détails du rôle.
   */
  getRoleById(roleId: number): Observable<Roles> {
    const url = `${this.apiUrl}/${roleId}`;
    return this.http.get<Roles>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 3. Crée un nouveau rôle.
   * Envoie une requête POST avec les données du rôle.
   * @param role - Données du rôle à créer.
   * @returns Observable contenant la réponse de l'API.
   */
  createRole(role: any): Observable<any> {
    return this.http.post(this.apiUrl, role).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 4. Supprime un rôle par son ID.
   * @param roleId - L'identifiant du rôle.
   * @returns Observable avec un retour vide ou un message de confirmation.
   */
  deleteRole(roleId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${roleId}`);
  }


  /**
   * 5. Met à jour un rôle spécifique.
   * @param roleId - L'identifiant du rôle.
   * @param roleData - Nouvelles données pour le rôle.
   * @returns Observable contenant la réponse de l'API.
   */
  updateRole(roleId: number, roleData: any): Observable<any> {
    const url = `${this.apiUrl}/${roleId}`;
    return this.http.put(url, roleData).pipe(
      tap(() => {
        this.roleUpdatedSubject.next();
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 200 || error.status === 204) {
          return new Observable(observer => {
            observer.next({ message: 'Rôle mis à jour avec succès' });
            observer.complete();
          });
        }
        return this.handleError(error);
      })
    );
  }


  /**
   * 6. Renvoie un Observable pour suivre les mises à jour des rôles.
   * Permet aux composants de s'abonner à des notifications de changement.
   * @returns Observable de type void.
   */
  getRoleUpdatedObservable(): Observable<void> {
    return this.roleUpdatedSubject.asObservable();
  }

  /**
   * Gestion centralisée des erreurs.
   * Capture et formate les erreurs HTTP avant de les renvoyer.
   * @param error - L'erreur capturée (client ou serveur).
   * @returns Observable avec un message d'erreur formaté.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client.
      errorMessage = `Client-side error: ${error.error.message}`;
    } else {
      // Erreur côté serveur.
      errorMessage = `Server-side error (HTTP ${error.status}): ${error.error}`;
    }
    console.error(errorMessage); // Log de l'erreur pour le débogage.
    return throwError(errorMessage); // Renvoie l'erreur formatée pour être traitée par les abonnés.
  }
}

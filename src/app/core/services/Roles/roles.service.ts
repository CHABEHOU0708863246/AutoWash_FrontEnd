import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject, Observable, catchError, tap, throwError } from 'rxjs';
import { Roles } from '../../models/Roles/Roles';

@Injectable({
  providedIn: 'root'
})
export class RolesService {

  private apiUrl = 'https://localhost:7139/api/Roles';
  private roleUpdatedSubject = new Subject<void>();

  constructor(private http: HttpClient) { }

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

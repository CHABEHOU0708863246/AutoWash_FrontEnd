import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject, Observable, catchError, tap, throwError, map } from 'rxjs';
import { Centres } from '../../models/Centres/Centres';
import { Users } from '../../models/Users/Users';

// Interface pour correspondre à la réponse de l'API des managers
interface ManagerResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  isEnabled: boolean;
  roles: string[];
  workingHours: number;
  isPartTime: boolean;
  hireDate: string;
  gender?: string;
  contractType?: string;
  numberOfChildren?: number;
  maritalStatus?: string;
  residence?: string;
  postalAddress?: string;
  photoUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CentresService {

  private apiUrl = 'https://localhost:7139/api/Centres';
  private centreUpdatedSubject = new Subject<void>();

  constructor(private http: HttpClient) { }

  /**
   * Récupère tous les centres
   * @returns Observable contenant un tableau de centres
   */
  getAllCentres(): Observable<Centres[]> {
    return this.http.get<Centres[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère un centre spécifique par son ID
   * @param centreId - L'identifiant du centre
   * @returns Observable contenant les détails du centre
   */
  getCentreById(centreId: string): Observable<Centres> {
    const url = `${this.apiUrl}/${centreId}`;
    return this.http.get<Centres>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crée un nouveau centre
   * @param centre - Données du centre à créer
   * @returns Observable contenant la réponse de l'API
   */
  createCentre(centre: any): Observable<any> {
    return this.http.post(this.apiUrl, centre).pipe(
      tap(() => {
        this.centreUpdatedSubject.next();
      }),
      catchError(this.handleError)
    );
  }

  /**
 * Récupère la liste des gérants disponibles
 */
getAvailableManagers(): Observable<Users[]> {
  return this.http.get<any>(`${this.apiUrl}/managers`).pipe(
    map((response: any) => {
      // Vérifie si la réponse contient un tableau managerIds
      const managersArray = response.managerIds || response;

      // Si ce n'est pas un tableau, on le transforme en tableau
      const managers = Array.isArray(managersArray) ? managersArray : [managersArray];

      return managers.map((manager: any) => {
        // Extraction de l'ID selon la structure de la réponse
        const managerId = manager.id?.toString() ||
                         (manager.id?.timestamp ? manager.id.toString() : '');

        return new Users(
          managerId,
          manager.firstName,
          manager.lastName,
          manager.email || manager.userName,
          manager.phoneNumber,
          manager.isEnabled,
          manager.roles ? manager.roles.map((r: any) => r.toString()) : ['MANAGER'],
          manager.workingHours || 0,
          manager.isPartTime || false,
          manager.hireDate ? new Date(manager.hireDate) : new Date(),
          manager.gender,
          manager.contractType,
          manager.numberOfChildren,
          manager.maritalStatus,
          manager.residence,
          manager.postalAddress,
          manager.centreId,
          manager.photoUrl
        );
      });
    }),
    catchError(error => {
      console.error('Erreur dans getAvailableManagers:', error);
      return throwError(() => new Error('Erreur lors de la récupération des gérants'));
    })
  );
}


  /**
   * Met à jour un centre existant
   * @param centreId - L'identifiant du centre
   * @param centreData - Nouvelles données pour le centre
   * @returns Observable contenant la réponse de l'API
   */
  updateCentre(centreId: string, centreData: any): Observable<any> {
    const url = `${this.apiUrl}/${centreId}`;
    return this.http.put(url, centreData).pipe(
      tap(() => {
        this.centreUpdatedSubject.next();
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 200 || error.status === 204) {
          return new Observable(observer => {
            observer.next({ message: 'Centre mis à jour avec succès' });
            observer.complete();
          });
        }
        return this.handleError(error);
      })
    );
  }

  /**
   * Désactive un centre (soft delete)
   * @param centreId - L'identifiant du centre
   * @returns Observable avec un retour vide ou un message de confirmation
   */
  deleteCentre(centreId: string): Observable<any> {
    const url = `${this.apiUrl}/${centreId}`;
    return this.http.delete(url).pipe(
      tap(() => {
        this.centreUpdatedSubject.next();
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Renvoie un Observable pour suivre les mises à jour des centres
   * @returns Observable de type void
   */
  getCentreUpdatedObservable(): Observable<void> {
    return this.centreUpdatedSubject.asObservable();
  }

    /**
   * Exportation des centres.
   * @param fileType - Le type de fichier pour l'exportation (par exemple, 'CSV', 'PDF').
   * @returns Un Observable contenant le fichier exporté en format Blob.
   */
  exportCentres(fileType: string): Observable<Blob> {
    return this.http.get<Blob>(`${this.apiUrl}/export-centres?fileType=${fileType}`, { responseType: 'blob' as 'json' }); // Récupère le fichier exporté dans le type demandé.
  }

  /**
   * Gestion centralisée des erreurs
   * @param error - L'erreur capturée
   * @returns Observable avec un message d'erreur formaté
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur est survenue';
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur client: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      errorMessage = `Erreur serveur (HTTP ${error.status}): ${error.error}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}

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

  private readonly apiUrl = 'https://localhost:7139/api/Centres';
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
    if (!centreId || centreId.trim() === '') {
      return throwError(() => new Error('L\'identifiant du centre est requis'));
    }

    return this.http.get<Centres>(`${this.apiUrl}/${centreId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crée un nouveau centre
   * @param centre - Données du centre à créer
   * @returns Observable contenant la réponse de l'API
   */
  createCentre(centre: any): Observable<any> {
    if (!centre) {
      return throwError(() => new Error('Les données du centre sont requises'));
    }

    return this.http.post(this.apiUrl, centre).pipe(
      tap(() => {
        this.centreUpdatedSubject.next();
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère la liste des gérants disponibles
   * @returns Observable contenant un tableau d'utilisateurs-gérants
   */
  getAvailableManagers(): Observable<Users[]> {
    return this.http.get<any>(`${this.apiUrl}/managers`).pipe(
      map((response: any) => {
        if (!response) {
          return [];
        }

        // Vérifie si la réponse contient un tableau managerIds
        const managersArray = response.managerIds || response;

        // Si ce n'est pas un tableau, on le transforme en tableau
        const managers = Array.isArray(managersArray) ? managersArray : [managersArray];

        return managers
          .filter(manager => manager && manager.id) // Filtre les managers invalides
          .map((manager: any) => {
            // Extraction de l'ID selon la structure de la réponse
            const managerId = this.extractManagerId(manager.id);

            return new Users(
              managerId,
              manager.firstName || '',
              manager.lastName || '',
              manager.email || manager.userName || '',
              manager.phoneNumber || '',
              manager.isEnabled ?? true,
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
    if (!centreId || centreId.trim() === '') {
      return throwError(() => new Error('L\'identifiant du centre est requis'));
    }

    if (!centreData) {
      return throwError(() => new Error('Les données du centre sont requises'));
    }

    return this.http.put(`${this.apiUrl}/${centreId}`, centreData).pipe(
      tap(() => {
        this.centreUpdatedSubject.next();
      }),
      map(response => response || { message: 'Centre mis à jour avec succès' }),
      catchError((error: HttpErrorResponse) => {
        // Gestion spéciale pour les codes de succès sans contenu
        if (error.status === 200 || error.status === 204) {
          this.centreUpdatedSubject.next();
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
    if (!centreId || centreId.trim() === '') {
      return throwError(() => new Error('L\'identifiant du centre est requis'));
    }

    return this.http.delete(`${this.apiUrl}/${centreId}`).pipe(
      tap(() => {
        this.centreUpdatedSubject.next();
      }),
      map(response => response || { message: 'Centre supprimé avec succès' }),
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
   * Exportation des centres
   * @param fileType - Le type de fichier pour l'exportation (par exemple, 'CSV', 'PDF')
   * @returns Un Observable contenant le fichier exporté en format Blob
   */
  exportCentres(fileType: string): Observable<Blob> {
    if (!fileType || fileType.trim() === '') {
      return throwError(() => new Error('Le type de fichier est requis'));
    }

    const allowedTypes = ['CSV', 'PDF', 'EXCEL'];
    if (!allowedTypes.includes(fileType.toUpperCase())) {
      return throwError(() => new Error(`Type de fichier non supporté: ${fileType}`));
    }

    return this.http.get(`${this.apiUrl}/export-centres`, {
      params: { fileType },
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Extrait l'ID du manager selon sa structure
   * @param idObject L'objet ID du manager
   * @returns L'ID en string
   */
  private extractManagerId(idObject: any): string {
    if (typeof idObject === 'string') {
      return idObject;
    }

    if (idObject && typeof idObject === 'object') {
      return idObject.toString();
    }

    return '';
  }

  /**
   * Gestion centralisée des erreurs
   * @param error - L'erreur capturée
   * @returns Observable avec un message d'erreur formaté
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur client: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      const serverError = error.error?.message || error.error || 'Erreur serveur inconnue';
      errorMessage = `Erreur serveur (HTTP ${error.status}): ${serverError}`;
    }

    console.error('Erreur dans CentresService:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}

import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApplicationSettings } from '../../models/Settings/ApplicationSettings';
import { DiscountRule } from '../../models/Settings/DiscountRule';
import { ScheduleSettings } from '../../models/Settings/ScheduleSettings';
import {
  ServiceSetting,
} from '../../models/Settings/ServiceSetting';

/***
 * Service pour gérer les paramètres de l'application AutoWash
 * Fournit des méthodes pour interagir avec l'API backend
 */
@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly apiUrl = 'https://localhost:7139/api/Settings';
  private readonly validCategories = [
    'Basic',
    'Premium',
    'Interior',
    'Exterior',
    'Special',
    'Maintenance'
  ];

  constructor(private http: HttpClient) {}

  /***
   * GESTION GLOBALE DES PARAMÈTRES
   ***/

  /**
   * Récupère tous les paramètres d'un centre
   * @param centreId - L'identifiant du centre
   * @returns Observable<ApplicationSettings> - Les paramètres du centre
   */
  getSettings(centreId: string): Observable<ApplicationSettings> {
    return this.http
      .get<ApplicationSettings>(`${this.apiUrl}/${centreId}`)
      .pipe(
        map((response) => new ApplicationSettings(response)),
        catchError(this.handleError)
      );
  }



  /**
   * Met à jour tous les paramètres d'un centre
   * @param centreId - L'identifiant du centre
   * @param settings - Les nouveaux paramètres
   * @returns Observable<ApplicationSettings> - Les paramètres mis à jour
   */
  updateSettings(
    centreId: string,
    settings: ApplicationSettings
  ): Observable<ApplicationSettings> {
    return this.http
      .put<ApplicationSettings>(`${this.apiUrl}/${centreId}`, settings)
      .pipe(
        map((response) => new ApplicationSettings(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Crée des paramètres par défaut pour un nouveau centre
   * @param centreId - L'identifiant du nouveau centre
   * @returns Observable<ApplicationSettings> - Les paramètres par défaut créés
   */
  createDefaultSettings(centreId: string): Observable<ApplicationSettings> {
    return this.http
      .post<ApplicationSettings>(`${this.apiUrl}/${centreId}/initialize`, {})
      .pipe(
        map((response) => new ApplicationSettings(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Réinitialise les paramètres d'un centre aux valeurs par défaut
   * @param centreId - L'identifiant du centre
   * @returns Observable<boolean> - True si la réinitialisation a réussi
   */
  resetSettingsToDefault(centreId: string): Observable<boolean> {
    return this.http
      .put<boolean>(`${this.apiUrl}/${centreId}/reset`, {})
      .pipe(catchError(this.handleError));
  }

  /**
   * Supprime les paramètres d'un centre
   * @param centreId - L'identifiant du centre
   * @returns Observable<boolean> - True si la suppression a réussi
   */
  deleteSettings(centreId: string): Observable<boolean> {
    return this.http
      .delete<boolean>(`${this.apiUrl}/${centreId}`)
      .pipe(catchError(this.handleError));
  }

  /***
   * GESTION DES HORAIRES
   ***/

  /**
   * Récupère les paramètres d'horaire d'un centre
   * @param centreId - L'identifiant du centre
   * @returns Observable<ScheduleSettings> - Les paramètres d'horaire
   */
  getScheduleSettings(centreId: string): Observable<ScheduleSettings> {
    return this.http
      .get<ScheduleSettings>(`${this.apiUrl}/${centreId}/schedule`)
      .pipe(
        map((response) => new ScheduleSettings(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Met à jour les paramètres d'horaire d'un centre
   * @param centreId - L'identifiant du centre
   * @param schedule - Les nouveaux paramètres d'horaire
   * @returns Observable<ScheduleSettings> - Les paramètres mis à jour
   */
  updateScheduleSettings(
    centreId: string,
    schedule: ScheduleSettings
  ): Observable<ScheduleSettings> {
    return this.http
      .put<ScheduleSettings>(`${this.apiUrl}/${centreId}/schedule`, schedule)
      .pipe(
        map((response) => new ScheduleSettings(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Vérifie si le centre est ouvert à une date/heure donnée
   * @param centreId - L'identifiant du centre
   * @param dateTime - La date et heure à vérifier
   * @returns Observable<boolean> - True si le centre est ouvert
   */
  isCentreOpen(centreId: string, dateTime: Date): Observable<boolean> {
    const params = { dateTime: dateTime.toISOString() };
    return this.http
      .get<{ isOpen: boolean }>(`${this.apiUrl}/${centreId}/schedule/isopen`, {
        params,
      })
      .pipe(
        map((response) => response.isOpen),
        catchError(this.handleError)
      );
  }



  /***
   * GESTION DES PRESTATIONS DE SERVICE
   ***/

  /**
   * Récupère toutes les prestations d'un centre
   * @param centreId - L'identifiant du centre
   * @returns Observable<ServiceSetting[]> - La liste des prestations
   */
getServices(centreId: string): Observable<ServiceSetting[]> {
    return this.http.get<ServiceSetting[]>(`${this.apiUrl}/${centreId}/services`)
      .pipe(
        map(services => services.map(s => new ServiceSetting(s))),
        catchError(this.handleError)
      );
  }

  /**
   * Ajoute une nouvelle prestation
   * @param centreId - L'identifiant du centre
   * @param service - La nouvelle prestation
   * @returns Observable<ServiceSetting> - La prestation créée
   */
addService(centreId: string, service: ServiceSetting): Observable<ServiceSetting> {
    // Créer un objet propre sans l'ID pour la création
    const serviceToCreate = {
      name: service.name,
      description: service.description,
      isActive: service.isActive,
      estimatedDurationMinutes: service.estimatedDurationMinutes,
      includedServices: service.includedServices,
      category: service.category, // Maintenant numérique
      sortOrder: service.sortOrder,
      iconUrl: service.iconUrl || '',
      requiresApproval: service.requiresApproval
    };

    console.log('Données envoyées:', serviceToCreate);

    return this.http.post<ServiceSetting>(
      `${this.apiUrl}/${centreId}/services`,
      serviceToCreate // Envoyer directement l'objet
    ).pipe(
      map(response => new ServiceSetting(response)),
      catchError(this.handleError)
    );
  }


  /**
   * Met à jour une prestation existante
   * @param centreId - L'identifiant du centre
   * @param serviceId - L'identifiant de la prestation
   * @param service - Les nouvelles données de la prestation
   * @returns Observable<ServiceSetting> - La prestation mise à jour
   */
updateService(centreId: string, serviceId: string, service: ServiceSetting): Observable<ServiceSetting> {
    const serviceToUpdate = {
      name: service.name,
      description: service.description,
      isActive: service.isActive,
      estimatedDurationMinutes: service.estimatedDurationMinutes,
      includedServices: service.includedServices,
      category: service.category,
      sortOrder: service.sortOrder,
      iconUrl: service.iconUrl || '',
      requiresApproval: service.requiresApproval
    };

    return this.http.put<ServiceSetting>(
      `${this.apiUrl}/${centreId}/services/${serviceId}`,
      serviceToUpdate
    ).pipe(
      map(response => new ServiceSetting(response)),
      catchError(this.handleError)
    );
  }


    /**
   * Supprime un service
   */
  deleteService(centreId: string, serviceId: string): Observable<boolean> {
    return this.http.delete<boolean>(`${this.apiUrl}/${centreId}/services/${serviceId}`)
      .pipe(catchError(this.handleError));
  }

  /***
   * GESTION DE LA TARIFICATION
   ***/

  /**
   * Calcule le prix d'une prestation
   * @param centreId - L'identifiant du centre
   * @param serviceId - L'identifiant de la prestation
   * @param vehicleTypeId - L'identifiant du type de véhicule
   * @param zoneId - (Optionnel) L'identifiant de la zone
   * @returns Observable<number> - Le prix calculé
   */
  calculatePrice(
    centreId: string,
    serviceId: string,
    vehicleTypeId: string,
    zoneId?: string
  ): Observable<number> {
    const params: any = { serviceId, vehicleTypeId };
    if (zoneId) params.zoneId = zoneId;

    return this.http
      .get<{ price: number }>(`${this.apiUrl}/${centreId}/pricing/calculate`, {
        params,
      })
      .pipe(
        map((response) => response.price),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les règles de remise actives
   * @param centreId - L'identifiant du centre
   * @param serviceId - (Optionnel) Filtre par prestation
   * @param vehicleTypeId - (Optionnel) Filtre par type de véhicule
   * @returns Observable<DiscountRule[]> - La liste des remises actives
   */
  getActiveDiscounts(
    centreId: string,
    serviceId?: string,
    vehicleTypeId?: string
  ): Observable<DiscountRule[]> {
    const params: any = {};
    if (serviceId) params.serviceId = serviceId;
    if (vehicleTypeId) params.vehicleTypeId = vehicleTypeId;

    return this.http
      .get<DiscountRule[]>(
        `${this.apiUrl}/${centreId}/pricing/discounts/active`,
        { params }
      )
      .pipe(
        map((response) => response.map((d) => new DiscountRule(d))),
        catchError(this.handleError)
      );
  }

  /***
   * GESTION DU SYSTÈME
   ***/

  /**
   * Active le mode maintenance
   * @param centreId - L'identifiant du centre
   * @param message - Le message à afficher
   * @param durationMinutes - (Optionnel) La durée en minutes
   * @returns Observable<boolean> - True si l'activation a réussi
   */
  enableMaintenanceMode(
    centreId: string,
    message: string,
    durationMinutes?: number
  ): Observable<boolean> {
    const body = { message, durationMinutes };
    return this.http
      .post<boolean>(
        `${this.apiUrl}/${centreId}/system/maintenance/enable`,
        body
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Vérifie le statut du mode maintenance
   * @param centreId - L'identifiant du centre
   * @returns Observable<boolean> - True si le centre est en maintenance
   */
  getMaintenanceStatus(centreId: string): Observable<boolean> {
    return this.http
      .get<{ inMaintenance: boolean }>(
        `${this.apiUrl}/${centreId}/system/maintenance/status`
      )
      .pipe(
        map((response) => response.inMaintenance),
        catchError(this.handleError)
      );
  }

  /***
   * GESTION DE L'AUDIT
   ***/

  /**
   * Récupère l'historique des modifications
   * @param centreId - L'identifiant du centre
   * @param days - Le nombre de jours à remonter (défaut: 7)
   * @returns Observable<any[]> - La liste des entrées d'audit
   */
  getAuditLogs(centreId: string, days: number = 7): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.apiUrl}/${centreId}/audit`, {
        params: { days: days.toString() },
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupère tous les centres avec leurs services
   * @param activeOnly Filtre uniquement les services actifs
   * @returns Observable des centres avec leurs services
   */
  getAllCentersWithServices(activeOnly: boolean = true): Observable<{ [key: string]: ServiceSetting[] }> {
    return this.http.get<{ [key: string]: ServiceSetting[] }>(
      `${this.apiUrl}/centers/services`,
      {
        params: { activeOnly: activeOnly.toString() }
      }
    ).pipe(
      catchError(this.handleError),
      map(response => {
        // Validation des données reçues
        if (!response || typeof response !== 'object') {
          throw new Error('Format de réponse invalide');
        }
        return response;
      })
    );
  }

  /**
   * Récupère toutes les prestations de service pour un centre spécifique
   * @param centreId ID du centre
   * @param activeOnly True pour ne retourner que les services actifs
   * @returns Observable des services du centre
   */
  getServicesByCentreId(centreId: string, activeOnly: boolean = true): Observable<ServiceSetting[]> {
    if (!centreId || typeof centreId !== 'string') {
      return throwError(() => new Error('ID de centre invalide'));
    }

    return this.http.get<ServiceSetting[]>(
      `${this.apiUrl}/centers/${encodeURIComponent(centreId)}/services`,
      {
        params: { activeOnly: activeOnly.toString() }
      }
    ).pipe(
      catchError(this.handleError),
      map(services => {
        // Validation des services reçus
        if (!Array.isArray(services)) {
          throw new Error('Format de réponse invalide');
        }

        // Optionnel: validation de la structure de chaque service
        services.forEach(service => {
          if (!service.id || !service.name) {
            throw new Error('Service invalide reçu');
          }
        });

        return services;
      })
    );
  }

  /***
   * METHODES UTILITAIRES
   ***/

  /**
   * Gère les erreurs HTTP
   * @param error - L'erreur survenue
   * @returns Observable<never> - Un observable qui émet l'erreur
   */
  private handleError(error: HttpErrorResponse) {
    console.error('Erreur complète:', error);

    if (error.error instanceof ErrorEvent) {
      console.error('Erreur client:', error.error.message);
    } else {
      console.error(
        `Le serveur a retourné le code ${error.status}, contenu:`,
        error.error
      );
    }

    if (error.status === 404) {
      return throwError(() => new Error('Paramètres non trouvés'));
    } else if (error.status === 400) {
      return throwError(
        () => new Error(`Requête invalide: ${JSON.stringify(error.error)}`)
      );
    } else if (error.status === 500) {
      return throwError(
        () => new Error(`Erreur serveur: ${error.error?.message || 'Inconnu'}`)
      );
    }
    return throwError(() => new Error('Une erreur inattendue est survenue'));
  }
}

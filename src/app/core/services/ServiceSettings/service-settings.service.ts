import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiResponseData } from '../../models/ApiResponseData';
import { DayOfWeek } from '../../models/Settings/DayOfWeek';
import { ServiceMaterial } from '../../models/Settings/Services/ServiceMaterial';
import { ServiceSettings } from '../../models/Settings/Services/ServiceSettings';

@Injectable({
  providedIn: 'root',
})
export class ServiceSettingsService {
  private readonly baseUrl = `${environment.apiUrl}/api/ServiceSettings`;

  constructor(private http: HttpClient) {}

  //#region Méthodes CRUD de base

  /**
   * Récupère un service spécifique par son identifiant
   */
  getServiceById(
    serviceId: string
  ): Observable<ApiResponseData<ServiceSettings>> {
    return this.http.get<ApiResponseData<ServiceSettings>>(
      `${this.baseUrl}/${serviceId}`
    );
  }

  /**
   * Récupère tous les services d'un centre de lavage spécifique
   */
  getServicesByCentre(
    centreId: string
  ): Observable<ApiResponseData<ServiceSettings[]>> {
    return this.http.get<ApiResponseData<ServiceSettings[]>>(
      `${this.baseUrl}/centre/${centreId}`
    );
  }

  /**
   * Récupère tous les services actifs d'un centre
   */
  getActiveServicesByCentre(
    centreId: string
  ): Observable<ApiResponseData<ServiceSettings[]>> {
    return this.http.get<ApiResponseData<ServiceSettings[]>>(
      `${this.baseUrl}/centre/${centreId}/active`
    );
  }

  /**
   * Récupère les services par catégorie pour un centre donné
   */
  getServicesByCategory(
    centreId: string,
    category: string
  ): Observable<ApiResponseData<ServiceSettings[]>> {
    return this.http.get<ApiResponseData<ServiceSettings[]>>(
      `${this.baseUrl}/centre/${centreId}/category/${category}`
    );
  }

  /**
   * Crée un nouveau service pour un centre
   */
  createService(
    service: ServiceSettings
  ): Observable<ApiResponseData<ServiceSettings>> {
    return this.http.post<ApiResponseData<ServiceSettings>>(
      this.baseUrl,
      service
    );
  }

  /**
 * Met à jour un service existant
 */
updateService(
    serviceId: string,
    serviceData: any,
    updatedBy: string
  ): Observable<ApiResponseData<ServiceSettings>> {
    // Validation des paramètres
    if (!serviceId || serviceId.trim() === '') {
      throw new Error('serviceId is required');
    }

    if (!updatedBy || updatedBy.trim() === '') {
      throw new Error('updatedBy is required');
    }

    // Préparer les données pour la requête
    const updateRequest = {
      centreId: serviceData.centreId,
      name: serviceData.name,
      category: serviceData.category,
      description: serviceData.description || null,
      duration: serviceData.duration,
      sortOrder: serviceData.sortOrder,
      isActive: serviceData.isActive,
      requiresApproval: serviceData.requiresApproval,
      includedServices: serviceData.includedServices || [],
      basePrice: serviceData.basePrice,
      isAvailableOnline: serviceData.isAvailableOnline,
      isAvailableInStore: serviceData.isAvailableInStore,
      updatedBy: updatedBy.trim()
    };

    return this.http.put<ApiResponseData<ServiceSettings>>(
      `${this.baseUrl}/${serviceId}`,
      updateRequest
    );
  }

  /**
   * Supprime un service
   */
  deleteService(serviceId: string): Observable<ApiResponseData<boolean>> {
    return this.http.delete<ApiResponseData<boolean>>(
      `${this.baseUrl}/${serviceId}`
    );
  }

  /**
   * Active ou désactive un service
   */
  toggleServiceStatus(
    serviceId: string,
    isActive: boolean,
    updatedBy: string
  ): Observable<ApiResponseData<ServiceSettings>> {
    return this.http.patch<ApiResponseData<ServiceSettings>>(
      `${this.baseUrl}/${serviceId}/status`,
      { isActive },
      { params: { updatedBy } }
    );
  }

  //#endregion

  //#region Méthodes de disponibilité et planification

  /**
   * Vérifie si un service est disponible à une date et heure spécifique
   */
  isServiceAvailable(
    serviceId: string,
    dateTime: Date
  ): Observable<ApiResponseData<boolean>> {
    return this.http.get<ApiResponseData<boolean>>(
      `${this.baseUrl}/${serviceId}/available`,
      { params: { dateTime: dateTime.toISOString() } }
    );
  }

  /**
   * Récupère les services disponibles en ligne pour un centre
   */
  getOnlineAvailableServices(
    centreId: string
  ): Observable<ApiResponseData<ServiceSettings[]>> {
    return this.http.get<ApiResponseData<ServiceSettings[]>>(
      `${this.baseUrl}/centre/${centreId}/online-available`
    );
  }

  /**
   * Récupère les services disponibles en magasin pour un centre
   */
  getInStoreAvailableServices(
    centreId: string
  ): Observable<ApiResponseData<ServiceSettings[]>> {
    return this.http.get<ApiResponseData<ServiceSettings[]>>(
      `${this.baseUrl}/centre/${centreId}/in-store-available`
    );
  }

  /**
   * Vérifie si un service nécessite une approbation
   */
  requiresApproval(serviceId: string): Observable<ApiResponseData<boolean>> {
    return this.http.get<ApiResponseData<boolean>>(
      `${this.baseUrl}/${serviceId}/requires-approval`
    );
  }

  /**
   * Récupère les jours de disponibilité d'un service
   */
  getServiceAvailableDays(
    serviceId: string
  ): Observable<ApiResponseData<DayOfWeek[]>> {
    return this.http.get<ApiResponseData<DayOfWeek[]>>(
      `${this.baseUrl}/${serviceId}/available-days`
    );
  }

  /**
   * Récupère les heures de disponibilité d'un service
   */
  getServiceAvailableHours(
    serviceId: string
  ): Observable<
    ApiResponseData<{ earliestStart: string; latestStart: string }>
  > {
    return this.http.get<
      ApiResponseData<{ earliestStart: string; latestStart: string }>
    >(`${this.baseUrl}/${serviceId}/available-hours`);
  }

  //#endregion

  //#region Méthodes de tarification et calculs

  /**
   * Calcule le prix d'un service en fonction des règles de tarification
   */
  calculateServicePrice(
    serviceId: string,
    parameters?: Record<string, unknown>
  ): Observable<ApiResponseData<number>> {
    return this.http.post<ApiResponseData<number>>(
      `${this.baseUrl}/${serviceId}/calculate-price`,
      parameters || {}
    );
  }

  /**
   * Calcule les frais d'annulation pour un service
   */
  calculateCancellationFees(
    serviceId: string,
    cancellationTime: Date,
    reservationTime: Date
  ): Observable<ApiResponseData<number>> {
    return this.http.get<ApiResponseData<number>>(
      `${this.baseUrl}/${serviceId}/cancellation-fees`,
      {
        params: {
          cancellationTime: cancellationTime.toISOString(),
          reservationTime: reservationTime.toISOString(),
        },
      }
    );
  }

  /**
   * Vérifie si l'annulation est autorisée pour un service
   */
  isCancellationAllowed(
    serviceId: string,
    cancellationTime: Date,
    reservationTime: Date
  ): Observable<ApiResponseData<boolean>> {
    return this.http.get<ApiResponseData<boolean>>(
      `${this.baseUrl}/${serviceId}/is-cancellation-allowed`,
      {
        params: {
          cancellationTime: cancellationTime.toISOString(),
          reservationTime: reservationTime.toISOString(),
        },
      }
    );
  }

  //#endregion

  //#region Méthodes de ressources et matériaux

  /**
   * Récupère les matériaux requis pour un service
   */
  getRequiredMaterials(
    serviceId: string
  ): Observable<ApiResponseData<ServiceMaterial[]>> {
    return this.http.get<ApiResponseData<ServiceMaterial[]>>(
      `${this.baseUrl}/${serviceId}/required-materials`
    );
  }

  /**
   * Récupère les compétences requises pour un service
   */
  getRequiredSkills(serviceId: string): Observable<ApiResponseData<string[]>> {
    return this.http.get<ApiResponseData<string[]>>(
      `${this.baseUrl}/${serviceId}/required-skills`
    );
  }

  //#endregion

  //#region Méthodes de réservation

  /**
   * Vérifie si un service peut être réservé à l'avance
   */
  canBookInAdvance(
    serviceId: string,
    reservationDate: Date
  ): Observable<ApiResponseData<boolean>> {
    return this.http.get<ApiResponseData<boolean>>(
      `${this.baseUrl}/${serviceId}/can-book-in-advance`,
      { params: { reservationDate: reservationDate.toISOString() } }
    );
  }

  /**
   * Récupère le nombre de réservations disponibles pour un service à une date donnée
   */
  getAvailableReservations(
    serviceId: string,
    date: Date
  ): Observable<ApiResponseData<number>> {
    return this.http.get<ApiResponseData<number>>(
      `${this.baseUrl}/${serviceId}/available-reservations`,
      { params: { date: date.toISOString() } }
    );
  }

  //#endregion

  //#region Méthodes de recherche et tri

  /**
   * Récupère les services les plus populaires d'un centre
   */
  getMostPopularServices(
    centreId: string,
    limit = 10
  ): Observable<ApiResponseData<ServiceSettings[]>> {
    return this.http.get<ApiResponseData<ServiceSettings[]>>(
      `${this.baseUrl}/centre/${centreId}/most-popular`,
      { params: { limit: limit.toString() } }
    );
  }

  /**
   * Recherche des services par nom ou description
   */
  searchServices(
    centreId: string,
    searchTerm: string
  ): Observable<ApiResponseData<ServiceSettings[]>> {
    return this.http.get<ApiResponseData<ServiceSettings[]>>(
      `${this.baseUrl}/centre/${centreId}/search`,
      { params: { searchTerm } }
    );
  }

  /**
   * Récupère les services triés par ordre de priorité
   */
  getServicesSortedByOrder(
    centreId: string
  ): Observable<ApiResponseData<ServiceSettings[]>> {
    return this.http.get<ApiResponseData<ServiceSettings[]>>(
      `${this.baseUrl}/centre/${centreId}/sorted`
    );
  }

  //#endregion

  //#region Méthodes de gestion avancée

  /**
   * Duplique un service existant
   */
  duplicateService(
    serviceId: string,
    newName: string,
    createdBy: string
  ): Observable<ApiResponseData<ServiceSettings>> {
    return this.http.post<ApiResponseData<ServiceSettings>>(
      `${this.baseUrl}/${serviceId}/duplicate`,
      { newName },
      { params: { createdBy } }
    );
  }

  /**
   * Met à jour l'ordre de tri des services
   */
  updateServiceOrder(
    serviceOrders: Record<string, number>,
    updatedBy: string
  ): Observable<ApiResponseData<boolean>> {
    return this.http.patch<ApiResponseData<boolean>>(
      `${this.baseUrl}/update-order`,
      serviceOrders,
      { params: { updatedBy } }
    );
  }

  //#endregion
}

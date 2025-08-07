import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiResponseData } from '../../models/ApiResponseData';
import { VehicleTypeSettings, VehicleTypeHistory } from '../../models/Settings/Vehicles/VehicleTypeSettings';
import { VehicleTypeStatistics } from '../../models/Settings/Vehicles/VehicleTypeStatistics';
import { VehicleSize } from '../../models/Settings/Vehicles/VehicleSize';

@Injectable({
  providedIn: 'root'
})
export class VehiclesSettingsService {

  private readonly baseUrl = `${environment.apiUrl}/api/VehiclesType`;

  constructor(private http: HttpClient) { }

  //#region Méthodes CRUD de base

  /**
   * Récupère un type de véhicule spécifique par son identifiant
   */
  getVehicleTypeById(vehicleTypeId: string): Observable<ApiResponseData<VehicleTypeSettings>> {
    return this.http.get<ApiResponseData<VehicleTypeSettings>>(
      `${this.baseUrl}/${vehicleTypeId}`
    );
  }

  /**
   * Récupère tous les types de véhicules d'un centre de lavage spécifique
   */
  getVehicleTypesByCentre(centreId: string): Observable<ApiResponseData<VehicleTypeSettings[]>> {
    return this.http.get<ApiResponseData<VehicleTypeSettings[]>>(
      `${this.baseUrl}/centre/${centreId}`
    );
  }

  /**
   * Récupère tous les types de véhicules actifs d'un centre
   */
  getActiveVehicleTypesByCentre(centreId: string): Observable<ApiResponseData<VehicleTypeSettings[]>> {
    return this.http.get<ApiResponseData<VehicleTypeSettings[]>>(
      `${this.baseUrl}/centre/${centreId}/active`
    );
  }

  /**
   * Récupère les types de véhicules par taille pour un centre donné
   */
  getVehicleTypesBySize(centreId: string, size: VehicleSize): Observable<ApiResponseData<VehicleTypeSettings[]>> {
    return this.http.get<ApiResponseData<VehicleTypeSettings[]>>(
      `${this.baseUrl}/centre/${centreId}/size/${size}`
    );
  }

  /**
   * Crée un nouveau type de véhicule pour un centre
   */
  createVehicleType(vehicleType: VehicleTypeSettings): Observable<ApiResponseData<VehicleTypeSettings>> {
    return this.http.post<ApiResponseData<VehicleTypeSettings>>(
      this.baseUrl,
      vehicleType
    );
  }

  /**
   * Met à jour un type de véhicule existant
   */
  updateVehicleType(vehicleType: any, updatedBy: string): Observable<any> {
  const params = new HttpParams().set('updatedBy', updatedBy);

  return this.http.put<any>(
    `${this.baseUrl}/${vehicleType.id}`,
    vehicleType,
    { params }
  );
}

  /**
   * Supprime un type de véhicule (suppression logique)
   */
  deleteVehicleType(vehicleTypeId: string, deletedBy: string): Observable<ApiResponseData<boolean>> {
    return this.http.delete<ApiResponseData<boolean>>(
      `${this.baseUrl}/${vehicleTypeId}`,
      { body: { deletedBy } }
    );
  }

  //#endregion

  //#region Méthodes de disponibilité

  /**
   * Récupère les types de véhicules disponibles en ligne pour un centre
   */
  getOnlineAvailableVehicleTypes(centreId: string): Observable<ApiResponseData<VehicleTypeSettings[]>> {
    return this.http.get<ApiResponseData<VehicleTypeSettings[]>>(
      `${this.baseUrl}/centre/${centreId}/online-available`
    );
  }

  /**
   * Récupère les types de véhicules disponibles en magasin pour un centre
   */
  getInStoreAvailableVehicleTypes(centreId: string): Observable<ApiResponseData<VehicleTypeSettings[]>> {
    return this.http.get<ApiResponseData<VehicleTypeSettings[]>>(
      `${this.baseUrl}/centre/${centreId}/in-store-available`
    );
  }

  //#endregion

  //#region Méthodes de tarification

  /**
   * Calcule le multiplicateur de prix pour un type de véhicule et un service
   */
  getPriceMultiplier(vehicleTypeId: string, serviceId?: string): Observable<ApiResponseData<number>> {
    const url = serviceId
      ? `${this.baseUrl}/${vehicleTypeId}/multiplier/${serviceId}`
      : `${this.baseUrl}/${vehicleTypeId}/multiplier`;

    return this.http.get<ApiResponseData<number>>(url);
  }

  /**
   * Met à jour les multiplicateurs de service pour un type de véhicule
   */
  updateServiceMultipliers(
    vehicleTypeId: string,
    serviceMultipliers: Record<string, number>,
    updatedBy: string
  ): Observable<ApiResponseData<VehicleTypeSettings>> {
    return this.http.put<ApiResponseData<VehicleTypeSettings>>(
      `${this.baseUrl}/${vehicleTypeId}/multipliers`,
      { serviceMultipliers, updatedBy }
    );
  }

  //#endregion

  //#region Méthodes de statistiques

  /**
   * Met à jour les statistiques d'utilisation d'un type de véhicule
   */
  updateUsageStatistics(
    vehicleTypeId: string,
    serviceDurationMinutes: number,
    revenue: number
  ): Observable<ApiResponseData<boolean>> {
    return this.http.put<ApiResponseData<boolean>>(
      `${this.baseUrl}/${vehicleTypeId}/stats`,
      { serviceDurationMinutes, revenue }
    );
  }

  /**
   * Récupère les statistiques d'un type de véhicule
   */
  getVehicleTypeStatistics(
    vehicleTypeId: string,
    startDate: Date,
    endDate: Date
  ): Observable<ApiResponseData<VehicleTypeStatistics>> {
    return this.http.get<ApiResponseData<VehicleTypeStatistics>>(
      `${this.baseUrl}/${vehicleTypeId}/stats?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    );
  }

  /**
   * Récupère les statistiques globales des types de véhicules d'un centre
   */
  getCentreVehicleTypeStatistics(
    centreId: string,
    startDate: Date,
    endDate: Date
  ): Observable<ApiResponseData<VehicleTypeStatistics[]>> {
    return this.http.get<ApiResponseData<VehicleTypeStatistics[]>>(
      `${this.baseUrl}/centre/${centreId}/stats?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    );
  }

  //#endregion

  //#region Méthodes de recherche

  /**
   * Recherche des types de véhicules par nom ou description
   */
  searchVehicleTypes(
    centreId: string,
    searchTerm: string
  ): Observable<ApiResponseData<VehicleTypeSettings[]>> {
    return this.http.get<ApiResponseData<VehicleTypeSettings[]>>(
      `${this.baseUrl}/centre/${centreId}/search?term=${searchTerm}`
    );
  }

  //#endregion

  //#region Méthodes d'initialisation

  /**
   * Initialise les types de véhicules par défaut pour un nouveau centre
   */
  initializeDefaultVehicleTypes(
    centreId: string,
    createdBy: string
  ): Observable<ApiResponseData<VehicleTypeSettings[]>> {
    return this.http.post<ApiResponseData<VehicleTypeSettings[]>>(
      `${this.baseUrl}/centre/${centreId}/initialize?createdBy=${createdBy}`,
      { centreId, createdBy }
    );
  }

  //#endregion

  //#region Méthodes d'historique

  /**
   * Récupère l'historique des modifications d'un type de véhicule
   */
  getVehicleTypeHistory(
    vehicleTypeId: string,
    limit = 50
  ): Observable<ApiResponseData<VehicleTypeHistory[]>> {
    return this.http.get<ApiResponseData<VehicleTypeHistory[]>>(
      `${this.baseUrl}/${vehicleTypeId}/history?limit=${limit}`
    );
  }

}

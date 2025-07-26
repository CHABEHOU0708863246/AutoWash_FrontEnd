import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiResponseData } from '../../models/ApiResponseData';
import { Customer } from '../../models/Customer/Customer';

@Injectable({
  providedIn: 'root'
})
export class CustomersService {
  private readonly baseUrl = `${environment.apiUrl}/api/Customers`;

  constructor(private http: HttpClient) { }

  //#region Méthodes CRUD de base

  /**
   * Crée un nouveau client
   */
  createCustomer(
    phone: string,
    name?: string,
    email?: string
  ): Observable<ApiResponseData<Customer>> {
    // Validation des paramètres
    if (!phone || phone.trim() === '') {
      throw new Error('Le numéro de téléphone est obligatoire');
    }

    const requestBody = {
      phone: phone.trim(),
      name: name?.trim(),
      email: email?.trim()
    };

    return this.http.post<ApiResponseData<Customer>>(
      this.baseUrl,
      requestBody
    );
  }

  /**
   * Récupère un client par son ID
   */
  getCustomerById(customerId: string): Observable<ApiResponseData<Customer>> {
    if (!customerId || customerId.trim() === '') {
      throw new Error('customerId est requis');
    }

    return this.http.get<ApiResponseData<Customer>>(
      `${this.baseUrl}/${customerId}`
    );
  }

  /**
   * Récupère un client par son numéro de téléphone
   */
  getCustomerByPhone(phone: string): Observable<ApiResponseData<Customer>> {
    if (!phone || phone.trim() === '') {
      throw new Error('Le numéro de téléphone est requis');
    }

    return this.http.get<ApiResponseData<Customer>>(
      `${this.baseUrl}/phone/${phone}`
    );
  }

  /**
   * Met à jour les informations d'un client
   */
  updateCustomer(
    customerId: string,
    updateData: {
      name?: string;
      email?: string;
      isActive?: boolean;
    }
  ): Observable<ApiResponseData<Customer>> {
    if (!customerId || customerId.trim() === '') {
      throw new Error('customerId est requis');
    }

    return this.http.put<ApiResponseData<Customer>>(
      `${this.baseUrl}/${customerId}`,
      updateData
    );
  }

  //#endregion

  //#region Méthodes spécifiques aux clients

  /**
   * Incrémente le nombre de réservations complétées et le montant dépensé
   */
  incrementCustomerBookings(
    customerId: string,
    amountSpent: number
  ): Observable<ApiResponseData<Customer>> {
    if (!customerId || customerId.trim() === '') {
      throw new Error('customerId est requis');
    }

    if (amountSpent < 0) {
      throw new Error('Le montant dépensé ne peut pas être négatif');
    }

    return this.http.patch<ApiResponseData<Customer>>(
      `${this.baseUrl}/${customerId}/increment-bookings`,
      { amountSpent }
    );
  }

  /**
   * Ajoute une plaque d'immatriculation au client
   */
  addVehiclePlate(
    customerId: string,
    vehiclePlate: string
  ): Observable<ApiResponseData<Customer>> {
    if (!customerId || customerId.trim() === '') {
      throw new Error('customerId est requis');
    }

    if (!vehiclePlate || vehiclePlate.trim() === '') {
      throw new Error('La plaque d\'immatriculation est requise');
    }

    return this.http.patch<ApiResponseData<Customer>>(
      `${this.baseUrl}/${customerId}/add-vehicle-plate`,
      { vehiclePlate: vehiclePlate.trim().toUpperCase() }
    );
  }

  /**
   * Supprime une plaque d'immatriculation du client
   */
  removeVehiclePlate(
    customerId: string,
    vehiclePlate: string
  ): Observable<ApiResponseData<Customer>> {
    if (!customerId || customerId.trim() === '') {
      throw new Error('customerId est requis');
    }

    if (!vehiclePlate || vehiclePlate.trim() === '') {
      throw new Error('La plaque d\'immatriculation est requise');
    }

    return this.http.patch<ApiResponseData<Customer>>(
      `${this.baseUrl}/${customerId}/remove-vehicle-plate`,
      { vehiclePlate: vehiclePlate.trim().toUpperCase() }
    );
  }

  /**
   * Active ou désactive un client
   */
  toggleCustomerStatus(
    customerId: string,
    isActive: boolean
  ): Observable<ApiResponseData<Customer>> {
    if (!customerId || customerId.trim() === '') {
      throw new Error('customerId est requis');
    }

    return this.http.patch<ApiResponseData<Customer>>(
      `${this.baseUrl}/${customerId}/status`,
      { isActive }
    );
  }

  //#endregion

  //#region Méthodes de recherche et filtrage

  /**
   * Recherche des clients par nom ou numéro de téléphone
   */
  searchCustomers(
    searchTerm: string,
    centreId?: string
  ): Observable<ApiResponseData<Customer[]>> {
    if (!searchTerm || searchTerm.trim() === '') {
      throw new Error('Le terme de recherche est requis');
    }

    const params: any = { searchTerm };
    if (centreId) {
      params.centreId = centreId;
    }

    return this.http.get<ApiResponseData<Customer[]>>(
      `${this.baseUrl}/search`,
      { params }
    );
  }

  /**
   * Récupère les clients actifs d'un centre
   */
  getActiveCustomers(
    centreId: string,
    limit = 100
  ): Observable<ApiResponseData<Customer[]>> {
    if (!centreId || centreId.trim() === '') {
      throw new Error('centreId est requis');
    }

    return this.http.get<ApiResponseData<Customer[]>>(
      `${this.baseUrl}/centre/${centreId}/active`,
      { params: { limit: limit.toString() } }
    );
  }

  /**
   * Récupère les clients ayant dépensé le plus
   */
  getTopSpendingCustomers(
    centreId: string,
    limit = 10
  ): Observable<ApiResponseData<Customer[]>> {
    if (!centreId || centreId.trim() === '') {
      throw new Error('centreId est requis');
    }

    return this.http.get<ApiResponseData<Customer[]>>(
      `${this.baseUrl}/centre/${centreId}/top-spenders`,
      { params: { limit: limit.toString() } }
    );
  }

  /**
   * Récupère les clients fréquents (nombre de visites)
   */
  getFrequentCustomers(
    centreId: string,
    limit = 10
  ): Observable<ApiResponseData<Customer[]>> {
    if (!centreId || centreId.trim() === '') {
      throw new Error('centreId est requis');
    }

    return this.http.get<ApiResponseData<Customer[]>>(
      `${this.baseUrl}/centre/${centreId}/frequent`,
      { params: { limit: limit.toString() } }
    );
  }

  //#endregion

  //#region Méthodes de statistiques

  /**
   * Récupère les statistiques des clients pour un centre
   */
  getCustomerStatistics(
    centreId: string
  ): Observable<ApiResponseData<{
    totalCustomers: number;
    activeCustomers: number;
    averageSpending: number;
    averageVisits: number;
  }>> {
    if (!centreId || centreId.trim() === '') {
      throw new Error('centreId est requis');
    }

    return this.http.get<ApiResponseData<{
      totalCustomers: number;
      activeCustomers: number;
      averageSpending: number;
      averageVisits: number;
    }>>(`${this.baseUrl}/centre/${centreId}/statistics`);
  }

  /**
   * Récupère l'historique des visites d'un client
   */
  getCustomerVisitHistory(
    customerId: string,
    limit = 20
  ): Observable<ApiResponseData<any[]>> {
    if (!customerId || customerId.trim() === '') {
      throw new Error('customerId est requis');
    }

    return this.http.get<ApiResponseData<any[]>>(
      `${this.baseUrl}/${customerId}/visit-history`,
      { params: { limit: limit.toString() } }
    );
  }

  //#endregion

  //#region Méthodes de fidélisation

  /**
   * Applique une remise de fidélité à un client
   */
  applyLoyaltyDiscount(
    customerId: string,
    discountPercentage: number
  ): Observable<ApiResponseData<Customer>> {
    if (!customerId || customerId.trim() === '') {
      throw new Error('customerId est requis');
    }

    if (discountPercentage < 0 || discountPercentage > 100) {
      throw new Error('Le pourcentage de remise doit être entre 0 et 100');
    }

    return this.http.patch<ApiResponseData<Customer>>(
      `${this.baseUrl}/${customerId}/apply-loyalty-discount`,
      { discountPercentage }
    );
  }

  /**
   * Ajoute des points de fidélité à un client
   */
  addLoyaltyPoints(
    customerId: string,
    points: number
  ): Observable<ApiResponseData<Customer>> {
    if (!customerId || customerId.trim() === '') {
      throw new Error('customerId est requis');
    }

    if (points < 0) {
      throw new Error('Les points de fidélité ne peuvent pas être négatifs');
    }

    return this.http.patch<ApiResponseData<Customer>>(
      `${this.baseUrl}/${customerId}/add-loyalty-points`,
      { points }
    );
  }

  //#endregion
}

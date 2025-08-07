import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiResponseData } from '../../models/ApiResponseData';
import { WashSession } from '../../models/Wash/WashSession';
import { PriceCalculationResult } from '../../models/Wash/PriceCalculationResult';
import { CustomerPayment } from '../../models/Payments/CustomerPayment';
import { PaymentMethod } from '../../models/Payments/PaymentMethod';
import { Customer } from '../../models/Customer/Customer';
import { Centres } from '../../models/Centres/Centres';
import { PaymentInfo } from '../../models/Payments/PaymentInfo';
import { CreateOrUpdateCustomerRequest } from '../../models/Wash/CreateOrUpdateCustomerRequest';
import { WashRegistration } from '../../models/Wash/WashRegistration';
import { ServiceSettings } from '../../models/Settings/Services/ServiceSettings';
import { VehicleTypeSettings } from '../../models/Settings/Vehicles/VehicleTypeSettings';

@Injectable({
  providedIn: 'root'
})
export class WashsService {
  private readonly baseUrl = `${environment.apiUrl}/api/WashRegistration`;

  constructor(private http: HttpClient) {}

  //#region Méthodes principales d'enregistrement

  /**
 * Récupère tous les services
 */
getAllServices(): Observable<ApiResponseData<ServiceSettings[]>> {
  return this.http.get<ApiResponseData<ServiceSettings[]>>(
    `${this.baseUrl}/all-services`
  );
}

/**
 * Récupère tous les types de véhicules
 */
getAllVehicleTypes(): Observable<ApiResponseData<VehicleTypeSettings[]>> {
  return this.http.get<ApiResponseData<VehicleTypeSettings[]>>(
    `${this.baseUrl}/all-vehicle-types`
  );
}

  /**
 * Récupère toutes les sessions de lavage
 */
getAllWashSessions(): Observable<ApiResponseData<WashSession[]>> {
  return this.http.get<ApiResponseData<WashSession[]>>(
    `${this.baseUrl}/all-sessions`
  );
}


  /**
   * Enregistre une nouvelle session de lavage
   */
  registerWash(registration: WashRegistration): Observable<ApiResponseData<WashSession>> {
    return this.http.post<ApiResponseData<WashSession>>(
      `${this.baseUrl}`,
      registration
    );
  }

  //#endregion

  //#region Méthodes de calcul de prix

  /**
   * Calcule le prix d'un lavage basé sur le service et le type de véhicule
   */
  calculateWashPrice(serviceId: string, vehicleTypeId: string): Observable<ApiResponseData<number>> {
    const params = new HttpParams()
      .set('serviceId', serviceId)
      .set('vehicleTypeId', vehicleTypeId);

    return this.http.get<ApiResponseData<number>>(
      `${this.baseUrl}/calculate-base-price`, // URL distincte
      { params }
    );
  }

  /**
   * Calcule le prix final avec remises éventuelles
   */
  calculateFinalPrice(
    serviceId: string,
    vehicleTypeId: string,
    customerPhone?: string
  ): Observable<ApiResponseData<PriceCalculationResult>> {
    let params = new HttpParams()
      .set('serviceId', serviceId)
      .set('vehicleTypeId', vehicleTypeId);

    if (customerPhone) {
      params = params.set('customerPhone', customerPhone);
    }

    return this.http.get<ApiResponseData<PriceCalculationResult>>(
      `${this.baseUrl}/calculate-final-price`, // URL distincte et correcte
      { params }
    );
  }

  /**
   * Applique une remise de fidélité
   */
  applyLoyaltyDiscount(
    customerPhone: string,
    originalPrice: number
  ): Observable<ApiResponseData<number>> {
    const params = new HttpParams()
      .set('customerPhone', customerPhone)
      .set('originalPrice', originalPrice.toString());

    return this.http.get<ApiResponseData<number>>(
      `${this.baseUrl}/loyalty-discount`, // URL distincte
      { params }
    );
  }

  //#endregion

  //#region Méthodes de validation et vérification

  /**
   * Vérifie si un service est disponible dans un centre
   */
  isServiceAvailableAtCentre(
    serviceId: string,
    centreId: string
  ): Observable<ApiResponseData<boolean>> {
    const params = new HttpParams()
      .set('serviceId', serviceId)
      .set('centreId', centreId);

    return this.http.get<ApiResponseData<boolean>>(
      `${this.baseUrl}/service-availability`, // URL plus claire
      { params }
    );
  }

  /**
   * Vérifie si un type de véhicule est accepté dans un centre
   */
  isVehicleTypeAccepted(
    vehicleTypeId: string,
    centreId: string
  ): Observable<ApiResponseData<boolean>> {
    const params = new HttpParams()
      .set('vehicleTypeId', vehicleTypeId)
      .set('centreId', centreId);

    return this.http.get<ApiResponseData<boolean>>(
      `${this.baseUrl}/vehicle-type-acceptance`, // URL plus claire
      { params }
    );
  }

  /**
   * Vérifie si un utilisateur peut enregistrer des lavages pour un centre
   */
  canUserRegisterWashForCentre(
    userId: string,
    centreId: string
  ): Observable<ApiResponseData<boolean>> {
    const params = new HttpParams()
      .set('userId', userId)
      .set('centreId', centreId);

    return this.http.get<ApiResponseData<boolean>>(
      `${this.baseUrl}/can-user-register`,
      { params }
    );
  }

  //#endregion

  //#region Méthodes de récupération de données

  /**
   * Récupère les détails d'un service
   */
  getServiceDetails(serviceId: string): Observable<ApiResponseData<ServiceSettings>> {
    return this.http.get<ApiResponseData<ServiceSettings>>(
      `${this.baseUrl}/service-details/${serviceId}`
    );
  }

  /**
   * Récupère les détails d'un type de véhicule
   */
  getVehicleTypeDetails(vehicleTypeId: string): Observable<ApiResponseData<VehicleTypeSettings>> {
    return this.http.get<ApiResponseData<VehicleTypeSettings>>(
      `${this.baseUrl}/vehicle-type-details/${vehicleTypeId}`
    );
  }

  /**
   * Récupère les centres actifs
   */
  getActiveCentres(): Observable<ApiResponseData<Centres[]>> {
    return this.http.get<ApiResponseData<Centres[]>>(
      `${this.baseUrl}/active-centres`
    );
  }

  /**
   * Récupère les services d'un centre
   */
  getServicesByCentre(centreId: string): Observable<ApiResponseData<ServiceSettings[]>> {
    return this.http.get<ApiResponseData<ServiceSettings[]>>(
      `${this.baseUrl}/services-by-centre/${centreId}`
    );
  }

  /**
   * Récupère les types de véhicules d'un centre
   */
  getVehicleTypesByCentre(centreId: string): Observable<ApiResponseData<VehicleTypeSettings[]>> {
    return this.http.get<ApiResponseData<VehicleTypeSettings[]>>(
      `${this.baseUrl}/vehicle-types-by-centre/${centreId}`
    );
  }

  //#endregion

  //#region Méthodes de gestion des paiements

  /**
   * Enregistre un paiement pour une session de lavage
   */
  registerPayment(
    washSessionId: string,
    paymentInfo: PaymentInfo
  ): Observable<ApiResponseData<CustomerPayment>> {
    return this.http.post<ApiResponseData<CustomerPayment>>(
      `${this.baseUrl}/register-payment/${washSessionId}`,
      paymentInfo
    );
  }

  /**
   * Génère une référence de transaction
   */
  generateTransactionReference(
    paymentMethod: PaymentMethod,
    operatorName?: string
  ): Observable<ApiResponseData<string>> {
    let params = new HttpParams()
      .set('paymentMethod', paymentMethod.toString());

    if (operatorName) {
      params = params.set('operatorName', operatorName);
    }

    return this.http.get<ApiResponseData<string>>(
      `${this.baseUrl}/generate-transaction-reference`,
      { params }
    );
  }

  //#endregion

  //#region Méthodes de gestion des clients

  /**
   * Trouve un client par son numéro de téléphone
   */
  findCustomerByPhone(phoneNumber: string): Observable<ApiResponseData<Customer | null>> {
  return this.http.get<ApiResponseData<Customer | null>>(
    `${this.baseUrl}/customers/${phoneNumber}`
  );
}

  /**
   * Crée ou met à jour un client
   */
  getOrCreateCustomer(
    customerRequest: CreateOrUpdateCustomerRequest
  ): Observable<ApiResponseData<Customer>> {
    return this.http.post<ApiResponseData<Customer>>(
      `${this.baseUrl}/customer`,
      customerRequest
    );
  }

  /**
   * Met à jour les statistiques d'un client
   */
  updateCustomerStats(
    customerPhone: string,
    amountSpent: number
  ): Observable<ApiResponseData<void>> {
    const params = new HttpParams()
      .set('customerPhone', customerPhone)
      .set('amountSpent', amountSpent.toString());

    return this.http.put<ApiResponseData<void>>(
      `${this.baseUrl}/update-customer-stats`,
      null,
      { params }
    );
  }

  /**
   * Ajoute une plaque de véhicule à un client
   */
  addVehiclePlateToCustomer(
    customerPhone: string,
    plate: string
  ): Observable<ApiResponseData<void>> {
    const params = new HttpParams()
      .set('customerPhone', customerPhone)
      .set('plate', plate);

    return this.http.put<ApiResponseData<void>>(
      `${this.baseUrl}/add-vehicle-plate`,
      null,
      { params }
    );
  }

  /**
   * Récupère l'historique des lavages d'un client
   */
getCustomerWashHistory(customerPhone: string, page: number = 1, pageSize: number = 5): Observable<ApiResponseData<WashSession[]>> {
  const params = new HttpParams()
    .set('customerPhone', customerPhone)
    .set('page', page.toString())
    .set('pageSize', pageSize.toString());
  return this.http.get<ApiResponseData<WashSession[]>>(`${this.baseUrl}/customers/${customerPhone}/history`, { params });
}

  //#endregion

  //#region Méthodes de gestion des sessions de lavage

  /**
   * Récupère une session de lavage par son ID
   */
  getWashSessionById(washSessionId: string): Observable<ApiResponseData<WashSession>> {
    return this.http.get<ApiResponseData<WashSession>>(
      `${this.baseUrl}/session/${washSessionId}`
    );
  }

  /**
   * Annule une session de lavage
   */
  cancelWash(
    washSessionId: string,
    cancelledBy: string,
    reason?: string
  ): Observable<ApiResponseData<boolean>> {
    const body = {
      cancelledBy,
      reason: reason || 'Cancelled by user'
    };

    return this.http.put<ApiResponseData<boolean>>(
      `${this.baseUrl}/cancel/${washSessionId}`,
      body
    );
  }

  /**
   * Marque une session comme commencée
   */
  startWashSession(
    washSessionId: string,
    startedBy: string
  ): Observable<ApiResponseData<WashSession>> {
    const body = { startedBy };

    return this.http.put<ApiResponseData<WashSession>>(
      `${this.baseUrl}/start/${washSessionId}`,
      body
    );
  }

  /**
   * Marque une session comme terminée
   */
  completeWashSession(
    washSessionId: string,
    completedBy: string,
    rating?: number,
    feedback?: string
  ): Observable<ApiResponseData<WashSession>> {
    const body = {
      completedBy,
      rating,
      feedback
    };

    return this.http.put<ApiResponseData<WashSession>>(
      `${this.baseUrl}/complete/${washSessionId}`,
      body
    );
  }

  /**
   * Récupère les lavages d'un centre pour une date donnée
   */
  getCentreWashes(
    centreId: string,
    date?: Date
  ): Observable<ApiResponseData<WashSession[]>> {
    let params = new HttpParams().set('centreId', centreId);

    if (date) {
      params = params.set('date', date.toISOString().split('T')[0]);
    }

    return this.http.get<ApiResponseData<WashSession[]>>(
      `${this.baseUrl}/centre-washes`,
      { params }
    );
  }

  /**
   * Récupère les lavages en cours pour un centre
   */
  getOngoingWashes(centreId: string): Observable<ApiResponseData<WashSession[]>> {
    const params = new HttpParams().set('centreId', centreId);

    return this.http.get<ApiResponseData<WashSession[]>>(
      `${this.baseUrl}/ongoing-washes`,
      { params }
    );
  }

  /**
   * Récupère les lavages en attente pour un centre
   */
  getPendingWashes(centreId: string): Observable<ApiResponseData<WashSession[]>> {
    const params = new HttpParams().set('centreId', centreId);

    return this.http.get<ApiResponseData<WashSession[]>>(
      `${this.baseUrl}/pending-washes`,
      { params }
    );
  }

  /**
   * Récupère les lavages terminés pour un centre
   */
  getCompletedWashes(
    centreId: string,
    startDate?: Date,
    endDate?: Date
  ): Observable<ApiResponseData<WashSession[]>> {
    let params = new HttpParams().set('centreId', centreId);

    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get<ApiResponseData<WashSession[]>>(
      `${this.baseUrl}/completed-washes`,
      { params }
    );
  }

  //#endregion

  //#region Méthodes de rapports et statistiques

  /**
   * Génère un rapport de lavage
   */
  generateWashReport(washSessionId: string): Observable<ApiResponseData<string>> {
    return this.http.get<ApiResponseData<string>>(
      `${this.baseUrl}/generate-report/${washSessionId}`,
      { responseType: 'text' as 'json' }
    );
  }

  /**
   * Génère un rapport PDF de lavage
   */
  generateWashReportPdf(washSessionId: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/generate-report-pdf/${washSessionId}`,
      { responseType: 'blob' }
    );
  }

  /**
   * Récupère les statistiques quotidiennes d'un centre
   */
  getDailyStats(
    centreId: string,
    date: Date
  ): Observable<ApiResponseData<{
    totalWashes: number;
    totalRevenue: number;
    averageRating: number;
    completedWashes: number;
    cancelledWashes: number;
  }>> {
    const params = new HttpParams()
      .set('centreId', centreId)
      .set('date', date.toISOString().split('T')[0]);

    return this.http.get<ApiResponseData<{
      totalWashes: number;
      totalRevenue: number;
      averageRating: number;
      completedWashes: number;
      cancelledWashes: number;
    }>>(
      `${this.baseUrl}/daily-stats`,
      { params }
    );
  }

  /**
   * Récupère les statistiques mensuelles d'un centre
   */
  getMonthlyStats(
    centreId: string,
    year: number,
    month: number
  ): Observable<ApiResponseData<{
    totalWashes: number;
    totalRevenue: number;
    averageRating: number;
    topServices: Array<{ serviceId: string; serviceName: string; count: number; revenue: number }>;
    customerRetentionRate: number;
  }>> {
    const params = new HttpParams()
      .set('centreId', centreId)
      .set('year', year.toString())
      .set('month', month.toString());

    return this.http.get<ApiResponseData<{
      totalWashes: number;
      totalRevenue: number;
      averageRating: number;
      topServices: Array<{ serviceId: string; serviceName: string; count: number; revenue: number }>;
      customerRetentionRate: number;
    }>>(
      `${this.baseUrl}/monthly-stats`,
      { params }
    );
  }

  //#endregion

  //#region Méthodes de recherche et filtrage

  /**
   * Recherche des sessions de lavage par critères
   */
  searchWashSessions(searchCriteria: {
    centreId?: string;
    customerPhone?: string;
    vehiclePlate?: string;
    serviceId?: string;
    startDate?: Date;
    endDate?: Date;
    isPaid?: boolean;
    isCompleted?: boolean;
    isCancelled?: boolean;
    page?: number;
    pageSize?: number;
  }): Observable<ApiResponseData<{
    sessions: WashSession[];
    totalCount: number;
    pageCount: number;
  }>> {
    let params = new HttpParams();

    Object.keys(searchCriteria).forEach(key => {
      const value = (searchCriteria as any)[key];
      if (value !== undefined && value !== null) {
        if (value instanceof Date) {
          params = params.set(key, value.toISOString());
        } else {
          params = params.set(key, value.toString());
        }
      }
    });

    return this.http.get<ApiResponseData<{
      sessions: WashSession[];
      totalCount: number;
      pageCount: number;
    }>>(
      `${this.baseUrl}/search`,
      { params }
    );
  }

  /**
   * Récupère les top clients d'un centre
   */
  getTopCustomers(
    centreId: string,
    limit: number = 10
  ): Observable<ApiResponseData<Array<{
    customer: Customer;
    totalWashes: number;
    totalSpent: number;
    lastVisit: Date;
  }>>> {
    const params = new HttpParams()
      .set('centreId', centreId)
      .set('limit', limit.toString());

    return this.http.get<ApiResponseData<Array<{
      customer: Customer;
      totalWashes: number;
      totalSpent: number;
      lastVisit: Date;
    }>>>(
      `${this.baseUrl}/top-customers`,
      { params }
    );
  }

  //#endregion

  //#region Méthodes de debug et maintenance

  /**
   * Exécute les méthodes de debug des collections
   */
  debugCollections(): Observable<ApiResponseData<{
    serviceCount: number;
    vehicleTypeCount: number;
    customerCount: number;
    washSessionCount: number;
  }>> {
    return this.http.get<ApiResponseData<{
      serviceCount: number;
      vehicleTypeCount: number;
      customerCount: number;
      washSessionCount: number;
    }>>(
      `${this.baseUrl}/debug-collections`
    );
  }

  /**
   * Synchronise les données entre les collections
   */
  syncData(centreId: string): Observable<ApiResponseData<{
    syncedRecords: number;
    errors: string[];
  }>> {
    const params = new HttpParams().set('centreId', centreId);

    return this.http.post<ApiResponseData<{
      syncedRecords: number;
      errors: string[];
    }>>(
      `${this.baseUrl}/sync-data`,
      null,
      { params }
    );
  }

  //#endregion

  //#region Méthodes utilitaires

  /**
   * Télécharge un rapport Excel des lavages
   */
  downloadWashesExcelReport(
    centreId: string,
    startDate: Date,
    endDate: Date
  ): Observable<Blob> {
    const params = new HttpParams()
      .set('centreId', centreId)
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());

    return this.http.get(
      `${this.baseUrl}/download-excel-report`,
      {
        params,
        responseType: 'blob'
      }
    );
  }

  /**
   * Envoie un SMS de confirmation à un client
   */
  sendConfirmationSms(
    washSessionId: string,
    customMessage?: string
  ): Observable<ApiResponseData<boolean>> {
    const body = { customMessage };

    return this.http.post<ApiResponseData<boolean>>(
      `${this.baseUrl}/send-confirmation-sms/${washSessionId}`,
      body
    );
  }

  /**
   * Envoie un email de reçu à un client
   */
  sendReceiptEmail(
    washSessionId: string,
    emailAddress?: string
  ): Observable<ApiResponseData<boolean>> {
    const body = { emailAddress };

    return this.http.post<ApiResponseData<boolean>>(
      `${this.baseUrl}/send-receipt-email/${washSessionId}`,
      body
    );
  }

  //#endregion
}

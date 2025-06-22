import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApplicationSettings } from '../../models/Settings/ApplicationSettings';
import { DiscountRule } from '../../models/Settings/DiscountRule';
import { ScheduleSettings } from '../../models/Settings/ScheduleSettings';
import { ServiceCategory, ServiceSetting } from '../../models/Settings/ServiceSetting';
import { VehicleSize, VehicleTypeSetting } from '../../models/Settings/VehicleTypeSetting';
import { DaySchedule } from '../../models/Settings/DaySchedule';
import { SpecialSchedule } from '../../models/Settings/SpecialSchedule';
import { DayOfWeek } from '../../models/Settings/DayOfWeek';
import { PricingSettings } from '../../models/Settings/PricingSettings';
import { NotificationSettings } from '../../models/Settings/NotificationSettings';
import { GeneralSettings } from '../../models/Settings/GeneralSettings';
import { ZonePricing } from '../../models/Settings/ZonePricing';
import { ServicePricing } from '../../models/Settings/ServicePricing';
import { IntegrationSettings } from '../../models/Settings/IntegrationSettings';
import { MaintenanceSettings } from '../../models/Settings/MaintenanceSettings';
import { NotificationRule, NotificationChannel } from '../../models/Settings/NotificationRule';
import { SecuritySettings } from '../../models/Settings/SecuritySettings';


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

  // 1. Récupérer les paramètres d'un centre
  getSettings(centreId: string): Observable<ApplicationSettings> {
    return this.http.get<ApplicationSettings>(`${this.apiUrl}/${centreId}`).pipe(
      map(response => new ApplicationSettings(response)),
      catchError(this.handleError)
    );
  }

  /**
   *  Mettre à jour les paramètres d'un centre
   * @param centreId
   * @param settings
   * @returns
   */
  updateSettings(centreId: string, settings: ApplicationSettings): Observable<ApplicationSettings> {
    return this.http.put<ApplicationSettings>(`${this.apiUrl}/${centreId}`, settings).pipe(
      map(response => new ApplicationSettings(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Créer des paramètres par défaut pour un centre
   * @param centreId
   * @returns
   */
  createDefaultSettings(centreId: string): Observable<ApplicationSettings> {
    return this.http.post<ApplicationSettings>(`${this.apiUrl}/${centreId}/initialize`, {}).pipe(
      map(response => new ApplicationSettings(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Réinitialiser les paramètres par défaut
   * @param centreId
   * @returns
   */
  resetToDefault(centreId: string): Observable<boolean> {
    return this.http.put<boolean>(`${this.apiUrl}/${centreId}/reset`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Supprimer les paramètres d'un centre
   * @param centreId
   * @returns
   */
  deleteSettings(centreId: string): Observable<boolean> {
    return this.http.delete<boolean>(`${this.apiUrl}/${centreId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer les horaires d'un centre
   * @param centreId
   * @returns
   */
  getScheduleSettings(centreId: string): Observable<ScheduleSettings> {
    return this.http.get<ScheduleSettings>(`${this.apiUrl}/${centreId}/schedule`).pipe(
      map(response => new ScheduleSettings(response)),
      catchError(this.handleError)
    );
  }

  /**
   *  Mettre à jour les horaires d'un centre
   * @param centreId
   * @param settings
   * @returns
   */
  updateScheduleSettings(centreId: string, settings: ScheduleSettings): Observable<ScheduleSettings> {
    return this.http.put<ScheduleSettings>(`${this.apiUrl}/${centreId}/schedule`, settings).pipe(
      map(response => new ScheduleSettings(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Vérifier si le centre est ouvert à une date/heure donnée
   * @param centreId
   * @param dateTime
   * @returns
   */
  isCentreOpen(centreId: string, dateTime: Date): Observable<boolean> {
    const params = { dateTime: dateTime.toISOString() };
    return this.http.get<{isOpen: boolean}>(`${this.apiUrl}/${centreId}/schedule/isopen`, { params }).pipe(
      map(response => response.isOpen),
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer tous les services d'un centre
   * @param centreId
   * @returns
   */
  getServices(centreId: string): Observable<ServiceSetting[]> {
    return this.http.get<ServiceSetting[]>(`${this.apiUrl}/${centreId}/services`).pipe(
      map(response => response.map(s => new ServiceSetting(s))),
      catchError(this.handleError)
    );
  }

  /**
   * Créer un nouveau service
   * @param centreId
   * @param service
   * @returns
   */
  createService(centreId: string, serviceData: any): Observable<ServiceSetting> {
  // Ajouter des logs pour debug
  console.log('Données envoyées à l\'API:', serviceData);

  return this.http.post<ServiceSetting>(`${this.apiUrl}/${centreId}/services`, serviceData).pipe(
    map(response => new ServiceSetting(response)),
    catchError(this.handleError)
  );
}

  /**
   * Récupère un service spécifique par son ID
   * @param centreId L'identifiant du centre
   * @param serviceId L'identifiant du service
   * @returns Observable<ServiceSetting> Le service demandé
   */
  getServiceById(centreId: string, serviceId: string): Observable<ServiceSetting> {
    return this.http.get<ServiceSetting>(`${this.apiUrl}/${centreId}/services/${serviceId}`).pipe(
      map(response => new ServiceSetting(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Met à jour un service existant
   * @param centreId L'identifiant du centre
   * @param serviceId L'identifiant du service à mettre à jour
   * @param service Les nouvelles données du service
   * @returns Observable<ServiceSetting> Le service mis à jour
   */
  updateService(centreId: string, serviceId: string, service: ServiceSetting): Observable<ServiceSetting> {
    return this.http.put<ServiceSetting>(
      `${this.apiUrl}/${centreId}/services/${serviceId}`,
      service
    ).pipe(
      map(response => new ServiceSetting(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Supprime un service
   * @param centreId L'identifiant du centre
   * @param serviceId L'identifiant du service à supprimer
   * @returns Observable<boolean> True si la suppression a réussi
   */
  deleteService(centreId: string, serviceId: string): Observable<boolean> {
    return this.http.delete<boolean>(
      `${this.apiUrl}/${centreId}/services/${serviceId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Active ou désactive un service
   * @param centreId L'identifiant du centre
   * @param serviceId L'identifiant du service
   * @returns Observable<boolean> Le nouveau statut (true = actif)
   */
  toggleServiceStatus(centreId: string, serviceId: string): Observable<boolean> {
    return this.http.patch<{isActive: boolean}>(
      `${this.apiUrl}/${centreId}/services/${serviceId}/toggle`,
      {}
    ).pipe(
      map(response => response.isActive),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les services par catégorie
   * @param centreId L'identifiant du centre
   * @param category La catégorie de service
   * @returns Observable<ServiceSetting[]> Liste des services de la catégorie
   */
  getServicesByCategory(centreId: string, category: ServiceCategory): Observable<ServiceSetting[]> {
    return this.http.get<ServiceSetting[]>(
      `${this.apiUrl}/${centreId}/services/category/${category}`
    ).pipe(
      map(response => response.map(s => new ServiceSetting(s))),
      catchError(this.handleError)
    );
  }

  /**
   * Réorganise l'ordre des services
   * @param centreId L'identifiant du centre
   * @param serviceOrders Dictionnaire ID service -> nouvel ordre
   * @returns Observable<boolean> True si la réorganisation a réussi
   */
  reorderServices(centreId: string, serviceOrders: {[key: string]: number}): Observable<boolean> {
    return this.http.put<boolean>(
      `${this.apiUrl}/${centreId}/services/reorder`,
      serviceOrders
    ).pipe(
      catchError(this.handleError)
    );
  }

/**
 * Met à jour les horaires pour plusieurs centres
 * @param centreIds Les IDs des centres à mettre à jour
 * @param settings Les nouveaux paramètres d'horaire
 * @returns Observable<boolean[]> Tableau des résultats pour chaque centre
 */
updateMultipleCentresSchedules(centreIds: string[], settings: ScheduleSettings): Observable<boolean[]> {
  const updateObservables = centreIds.map(centreId =>
    this.updateScheduleSettings(centreId, settings).pipe(
      map(() => true),
      catchError(() => of(false))
    )
  );
  return forkJoin(updateObservables);
}

  /**
   * Met à jour l'horaire d'un jour spécifique
   * @param centreId L'identifiant du centre
   * @param dayOfWeek Le jour de la semaine à mettre à jour
   * @param daySchedule Le nouvel horaire pour ce jour
   * @returns Observable<boolean> True si la mise à jour a réussi
   */
  updateDaySchedule(centreId: string, dayOfWeek: DayOfWeek, daySchedule: DaySchedule): Observable<boolean> {
    return this.http.put<boolean>(
      `${this.apiUrl}/${centreId}/schedule/days/${dayOfWeek}`,
      daySchedule
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Ajoute un horaire spécial (jour férié, etc.)
   * @param centreId L'identifiant du centre
   * @param specialSchedule L'horaire spécial à ajouter
   * @returns Observable<boolean> True si l'ajout a réussi
   */
  addSpecialSchedule(centreId: string, specialSchedule: SpecialSchedule): Observable<boolean> {
    return this.http.post<boolean>(
      `${this.apiUrl}/${centreId}/schedule/special-days`,
      specialSchedule
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Supprime un horaire spécial
   * @param centreId L'identifiant du centre
   * @param date La date de l'horaire à supprimer
   * @returns Observable<boolean> True si la suppression a réussi
   */
  removeSpecialSchedule(centreId: string, date: Date): Observable<boolean> {
    const params = { date: date.toISOString() };
    return this.http.delete<boolean>(
      `${this.apiUrl}/${centreId}/schedule/special-days`,
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les horaires spéciaux dans une période
   * @param centreId L'identifiant du centre
   * @param startDate Date de début (optionnelle)
   * @param endDate Date de fin (optionnelle)
   * @returns Observable<SpecialSchedule[]> Liste des horaires spéciaux
   */
  getSpecialSchedules(
    centreId: string,
    startDate?: Date,
    endDate?: Date
  ): Observable<SpecialSchedule[]> {
    let params = {};
    if (startDate) params = { ...params, startDate: startDate.toISOString() };
    if (endDate) params = { ...params, endDate: endDate.toISOString() };

    return this.http.get<SpecialSchedule[]>(
      `${this.apiUrl}/${centreId}/schedule/special-days`,
      { params }
    ).pipe(
      map(response => response.map(s => new SpecialSchedule(s))),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère tous les types de véhicules
   * @param centreId L'identifiant du centre
   * @returns Observable<VehicleTypeSetting[]> Liste des types de véhicules
   */
  getVehicleTypes(centreId: string): Observable<VehicleTypeSetting[]> {
    return this.http.get<VehicleTypeSetting[]>(
      `${this.apiUrl}/${centreId}/vehicle-types`
    ).pipe(
      map(response => response.map(v => new VehicleTypeSetting(v))),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère un type de véhicule par son ID
   * @param centreId L'identifiant du centre
   * @param vehicleTypeId L'identifiant du type de véhicule
   * @returns Observable<VehicleTypeSetting> Le type de véhicule demandé
   */
  getVehicleTypeById(centreId: string, vehicleTypeId: string): Observable<VehicleTypeSetting> {
    return this.http.get<VehicleTypeSetting>(
      `${this.apiUrl}/${centreId}/vehicle-types/${vehicleTypeId}`
    ).pipe(
      map(response => new VehicleTypeSetting(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Crée un nouveau type de véhicule
   * @param centreId L'identifiant du centre
   * @param vehicleType Les données du nouveau type
   * @returns Observable<VehicleTypeSetting> Le type créé
   */
  createVehicleType(centreId: string, vehicleType: VehicleTypeSetting): Observable<VehicleTypeSetting> {
    return this.http.post<VehicleTypeSetting>(
      `${this.apiUrl}/${centreId}/vehicle-types`,
      vehicleType
    ).pipe(
      map(response => new VehicleTypeSetting(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Met à jour un type de véhicule
   * @param centreId L'identifiant du centre
   * @param vehicleTypeId L'identifiant du type à mettre à jour
   * @param vehicleType Les nouvelles données
   * @returns Observable<VehicleTypeSetting> Le type mis à jour
   */
  updateVehicleType(
    centreId: string,
    vehicleTypeId: string,
    vehicleType: VehicleTypeSetting
  ): Observable<VehicleTypeSetting> {
    return this.http.put<VehicleTypeSetting>(
      `${this.apiUrl}/${centreId}/vehicle-types/${vehicleTypeId}`,
      vehicleType
    ).pipe(
      map(response => new VehicleTypeSetting(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Supprime un type de véhicule
   * @param centreId L'identifiant du centre
   * @param vehicleTypeId L'identifiant du type à supprimer
   * @returns Observable<boolean> True si la suppression a réussi
   */
  deleteVehicleType(centreId: string, vehicleTypeId: string): Observable<boolean> {
    return this.http.delete<boolean>(
      `${this.apiUrl}/${centreId}/vehicle-types/${vehicleTypeId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Active/désactive un type de véhicule
   * @param centreId L'identifiant du centre
   * @param vehicleTypeId L'identifiant du type
   * @returns Observable<boolean> Le nouveau statut (true = actif)
   */
  toggleVehicleTypeStatus(centreId: string, vehicleTypeId: string): Observable<boolean> {
    return this.http.patch<{isActive: boolean}>(
      `${this.apiUrl}/${centreId}/vehicle-types/${vehicleTypeId}/toggle`,
      {}
    ).pipe(
      map(response => response.isActive),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les types de véhicule par taille
   * @param centreId L'identifiant du centre
   * @param size La taille des véhicules
   * @returns Observable<VehicleTypeSetting[]> Liste des types correspondants
   */
  getVehicleTypesBySize(centreId: string, size: VehicleSize): Observable<VehicleTypeSetting[]> {
    return this.http.get<VehicleTypeSetting[]>(
      `${this.apiUrl}/${centreId}/vehicle-types/size/${size}`
    ).pipe(
      map(response => response.map(v => new VehicleTypeSetting(v))),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les paramètres de tarification
   * @param centreId L'identifiant du centre
   * @returns Observable<PricingSettings> Les paramètres de tarification
   */
  getPricingSettings(centreId: string): Observable<PricingSettings> {
    return this.http.get<PricingSettings>(
      `${this.apiUrl}/${centreId}/pricing`
    ).pipe(
      map(response => new PricingSettings(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Met à jour les paramètres de tarification
   * @param centreId L'identifiant du centre
   * @param pricing Les nouveaux paramètres
   * @returns Observable<PricingSettings> Les paramètres mis à jour
   */
  updatePricingSettings(centreId: string, pricing: PricingSettings): Observable<PricingSettings> {
    return this.http.put<PricingSettings>(
      `${this.apiUrl}/${centreId}/pricing`,
      pricing
    ).pipe(
      map(response => new PricingSettings(response)),
      catchError(this.handleError)
    );
  }


  /**
   * Récupère la tarification d'un service spécifique
   * @param centreId L'identifiant du centre
   * @param serviceId L'identifiant du service
   * @returns Observable<ServicePricing> La tarification du service
   */
  getServicePricing(centreId: string, serviceId: string): Observable<ServicePricing> {
    return this.http.get<ServicePricing>(
      `${this.apiUrl}/${centreId}/pricing/services/${serviceId}`
    ).pipe(
      map(response => new ServicePricing(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Met à jour la tarification d'un service
   * @param centreId L'identifiant du centre
   * @param serviceId L'identifiant du service
   * @param pricing La nouvelle tarification
   * @returns Observable<ServicePricing> La tarification mise à jour
   */
  updateServicePricing(
    centreId: string,
    serviceId: string,
    pricing: ServicePricing
  ): Observable<ServicePricing> {
    return this.http.put<ServicePricing>(
      `${this.apiUrl}/${centreId}/pricing/services/${serviceId}`,
      pricing
    ).pipe(
      map(response => new ServicePricing(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Calcule le prix d'un service pour un type de véhicule
   * @param centreId L'identifiant du centre
   * @param serviceId L'identifiant du service
   * @param vehicleTypeId L'identifiant du type de véhicule
   * @param zoneId L'identifiant de zone (optionnel)
   * @returns Observable<number> Le prix calculé
   */
  calculateServicePrice(
    centreId: string,
    serviceId: string,
    vehicleTypeId: string,
    zoneId?: string
  ): Observable<number> {
    const params: any = { serviceId, vehicleTypeId };
    if (zoneId) params.zoneId = zoneId;

    return this.http.get<{price: number}>(
      `${this.apiUrl}/${centreId}/pricing/calculate`,
      { params }
    ).pipe(
      map(response => response.price),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère la tarification par zone
   * @param centreId L'identifiant du centre
   * @returns Observable<ZonePricing[]> Liste des tarifications par zone
   */
  getZonePricing(centreId: string): Observable<ZonePricing[]> {
    return this.http.get<ZonePricing[]>(
      `${this.apiUrl}/${centreId}/pricing/zones`
    ).pipe(
      map(response => response.map(z => new ZonePricing(z))),
      catchError(this.handleError)
    );
  }

  /**
   * Crée une nouvelle tarification de zone
   * @param centreId L'identifiant du centre
   * @param zonePricing La tarification à créer
   * @returns Observable<ZonePricing> La tarification créée
   */
  createZonePricing(
    centreId: string,
    zonePricing: ZonePricing
  ): Observable<ZonePricing> {
    return this.http.post<ZonePricing>(
      `${this.apiUrl}/${centreId}/pricing/zones`,
      zonePricing
    ).pipe(
      map(response => new ZonePricing(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Met à jour une tarification de zone
   * @param centreId L'identifiant du centre
   * @param zoneName Le nom de la zone à mettre à jour
   * @param zonePricing Les nouvelles données de tarification
   * @returns Observable<ZonePricing> La tarification mise à jour
   */
  updateZonePricing(
    centreId: string,
    zoneName: string,
    zonePricing: ZonePricing
  ): Observable<ZonePricing> {
    return this.http.put<ZonePricing>(
      `${this.apiUrl}/${centreId}/pricing/zones/${zoneName}`,
      zonePricing
    ).pipe(
      map(response => new ZonePricing(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Supprime une tarification de zone
   * @param centreId L'identifiant du centre
   * @param zoneName Le nom de la zone à supprimer
   * @returns Observable<boolean> True si la suppression a réussi
   */
  deleteZonePricing(centreId: string, zoneName: string): Observable<boolean> {
    return this.http.delete<boolean>(
      `${this.apiUrl}/${centreId}/pricing/zones/${zoneName}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère toutes les règles de remise
   * @param centreId L'identifiant du centre
   * @returns Observable<DiscountRule[]> Liste des règles de remise
   */
  getDiscountRules(centreId: string): Observable<DiscountRule[]> {
    return this.http.get<DiscountRule[]>(
      `${this.apiUrl}/${centreId}/pricing/discount-rules`
    ).pipe(
      map(response => response.map(d => new DiscountRule(d))),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère une règle de remise spécifique
   * @param centreId L'identifiant du centre
   * @param discountId L'identifiant de la remise
   * @returns Observable<DiscountRule> La règle de remise demandée
   */
  getDiscountRuleById(centreId: string, discountId: string): Observable<DiscountRule> {
    return this.http.get<DiscountRule>(
      `${this.apiUrl}/${centreId}/pricing/discount-rules/${discountId}`
    ).pipe(
      map(response => new DiscountRule(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Crée une nouvelle règle de remise
   * @param centreId L'identifiant du centre
   * @param discountRule La règle à créer
   * @returns Observable<DiscountRule> La règle créée
   */
  createDiscountRule(
    centreId: string,
    discountRule: DiscountRule
  ): Observable<DiscountRule> {
    return this.http.post<DiscountRule>(
      `${this.apiUrl}/${centreId}/pricing/discount-rules`,
      discountRule
    ).pipe(
      map(response => new DiscountRule(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Met à jour une règle de remise existante
   * @param centreId L'identifiant du centre
   * @param discountId L'identifiant de la remise
   * @param discountRule Les nouvelles données de la remise
   * @returns Observable<DiscountRule> La règle mise à jour
   */
  updateDiscountRule(
    centreId: string,
    discountId: string,
    discountRule: DiscountRule
  ): Observable<DiscountRule> {
    return this.http.put<DiscountRule>(
      `${this.apiUrl}/${centreId}/pricing/discount-rules/${discountId}`,
      discountRule
    ).pipe(
      map(response => new DiscountRule(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Supprime une règle de remise
   * @param centreId L'identifiant du centre
   * @param discountId L'identifiant de la remise
   * @returns Observable<boolean> True si la suppression a réussi
   */
  deleteDiscountRule(centreId: string, discountId: string): Observable<boolean> {
    return this.http.delete<boolean>(
      `${this.apiUrl}/${centreId}/pricing/discount-rules/${discountId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Active/désactive une règle de remise
   * @param centreId L'identifiant du centre
   * @param discountId L'identifiant de la remise
   * @returns Observable<boolean> Le nouveau statut (true = actif)
   */
  toggleDiscountRuleStatus(centreId: string, discountId: string): Observable<boolean> {
    return this.http.patch<{isActive: boolean}>(
      `${this.apiUrl}/${centreId}/pricing/discount-rules/${discountId}/toggle`,
      {}
    ).pipe(
      map(response => response.isActive),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les règles de remise actives
   * @param centreId L'identifiant du centre
   * @param serviceId Filtre par service (optionnel)
   * @param vehicleTypeId Filtre par type de véhicule (optionnel)
   * @returns Observable<DiscountRule[]> Liste des règles actives
   */
  getActiveDiscountRules(
    centreId: string,
    serviceId?: string,
    vehicleTypeId?: string
  ): Observable<DiscountRule[]> {
    const params: any = {};
    if (serviceId) params.serviceId = serviceId;
    if (vehicleTypeId) params.vehicleTypeId = vehicleTypeId;

    return this.http.get<DiscountRule[]>(
      `${this.apiUrl}/${centreId}/pricing/discount-rules/active`,
      { params }
    ).pipe(
      map(response => response.map(d => new DiscountRule(d))),
      catchError(this.handleError)
    );
  }

  /**
   * Calcule une remise sur un prix
   * @param centreId L'identifiant du centre
   * @param originalPrice Le prix original
   * @param serviceId L'identifiant du service
   * @param vehicleTypeId L'identifiant du type de véhicule
   * @param sessionCount Le nombre de sessions (optionnel)
   * @returns Observable<number> Le montant de la remise calculée
   */
  calculateDiscount(
    centreId: string,
    originalPrice: number,
    serviceId: string,
    vehicleTypeId: string,
    sessionCount: number = 0
  ): Observable<number> {
    const params = {
      originalPrice: originalPrice.toString(),
      serviceId,
      vehicleTypeId,
      sessionCount: sessionCount.toString()
    };

    return this.http.get<{discount: number}>(
      `${this.apiUrl}/${centreId}/pricing/calculate-discount`,
      { params }
    ).pipe(
      map(response => response.discount),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les paramètres généraux du système
   * @param centreId L'identifiant du centre
   * @returns Observable<GeneralSettings> Les paramètres généraux
   */
  getGeneralSettings(centreId: string): Observable<GeneralSettings> {
    return this.http.get<GeneralSettings>(
      `${this.apiUrl}/${centreId}/system/general`
    ).pipe(
      map(response => new GeneralSettings(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Met à jour les paramètres généraux du système
   * @param centreId L'identifiant du centre
   * @param settings Les nouveaux paramètres
   * @returns Observable<GeneralSettings> Les paramètres mis à jour
   */
  updateGeneralSettings(
    centreId: string,
    settings: GeneralSettings
  ): Observable<GeneralSettings> {
    return this.http.put<GeneralSettings>(
      `${this.apiUrl}/${centreId}/system/general`,
      settings
    ).pipe(
      map(response => new GeneralSettings(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les paramètres de notification
   * @param centreId L'identifiant du centre
   * @returns Observable<NotificationSettings> Les paramètres de notification
   */
  getNotificationSettings(centreId: string): Observable<NotificationSettings> {
    return this.http.get<NotificationSettings>(
      `${this.apiUrl}/${centreId}/system/notifications`
    ).pipe(
      map(response => new NotificationSettings(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Met à jour les paramètres de notification
   * @param centreId L'identifiant du centre
   * @param settings Les nouveaux paramètres
   * @returns Observable<NotificationSettings> Les paramètres mis à jour
   */
  updateNotificationSettings(
    centreId: string,
    settings: NotificationSettings
  ): Observable<NotificationSettings> {
    return this.http.put<NotificationSettings>(
      `${this.apiUrl}/${centreId}/system/notifications`,
      settings
    ).pipe(
      map(response => new NotificationSettings(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Crée une nouvelle règle de notification
   * @param centreId L'identifiant du centre
   * @param rule La règle de notification à créer
   * @returns Observable<NotificationRule> La règle créée
   */
  createNotificationRule(
    centreId: string,
    rule: NotificationRule
  ): Observable<NotificationRule> {
    return this.http.post<NotificationRule>(
      `${this.apiUrl}/${centreId}/system/notifications/rules`,
      rule
    ).pipe(
      map(response => new NotificationRule(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Supprime une règle de notification
   * @param centreId L'identifiant du centre
   * @param eventType Le type d'événement de la règle à supprimer
   * @returns Observable<boolean> True si la suppression a réussi
   */
  deleteNotificationRule(centreId: string, eventType: string): Observable<boolean> {
    return this.http.delete<boolean>(
      `${this.apiUrl}/${centreId}/system/notifications/rules/${eventType}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Teste une notification
   * @param centreId L'identifiant du centre
   * @param eventType Le type d'événement à tester
   * @param channel Le canal de notification à tester
   * @returns Observable<boolean> True si le test a réussi
   */
  testNotification(
    centreId: string,
    eventType: string,
    channel: NotificationChannel
  ): Observable<boolean> {
    return this.http.post<boolean>(
      `${this.apiUrl}/${centreId}/system/notifications/test`,
      {},
      { params: { eventType, channel } }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les paramètres de sécurité
   * @param centreId L'identifiant du centre
   * @returns Observable<SecuritySettings> Les paramètres de sécurité
   */
  getSecuritySettings(centreId: string): Observable<SecuritySettings> {
    return this.http.get<SecuritySettings>(
      `${this.apiUrl}/${centreId}/system/security`
    ).pipe(
      map(response => new SecuritySettings(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Met à jour les paramètres de sécurité
   * @param centreId L'identifiant du centre
   * @param settings Les nouveaux paramètres
   * @returns Observable<SecuritySettings> Les paramètres mis à jour
   */
  updateSecuritySettings(
    centreId: string,
    settings: SecuritySettings
  ): Observable<SecuritySettings> {
    return this.http.put<SecuritySettings>(
      `${this.apiUrl}/${centreId}/system/security`,
      settings
    ).pipe(
      map(response => new SecuritySettings(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Valide l'accès par IP
   * @param centreId L'identifiant du centre
   * @param ipAddress L'adresse IP à valider
   * @returns Observable<boolean> True si l'accès est autorisé
   */
  validateIpAccess(centreId: string, ipAddress: string): Observable<boolean> {
    return this.http.get<{isValid: boolean}>(
      `${this.apiUrl}/${centreId}/system/security/validate-ip`,
      { params: { ipAddress } }
    ).pipe(
      map(response => response.isValid),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les paramètres d'intégration
   * @param centreId L'identifiant du centre
   * @returns Observable<IntegrationSettings> Les paramètres d'intégration
   */
  getIntegrationSettings(centreId: string): Observable<IntegrationSettings> {
    return this.http.get<IntegrationSettings>(
      `${this.apiUrl}/${centreId}/system/integrations`
    ).pipe(
      map(response => new IntegrationSettings(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Met à jour les paramètres d'intégration
   * @param centreId L'identifiant du centre
   * @param settings Les nouveaux paramètres
   * @returns Observable<IntegrationSettings> Les paramètres mis à jour
   */
  updateIntegrationSettings(
    centreId: string,
    settings: IntegrationSettings
  ): Observable<IntegrationSettings> {
    return this.http.put<IntegrationSettings>(
      `${this.apiUrl}/${centreId}/system/integrations`,
      settings
    ).pipe(
      map(response => new IntegrationSettings(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Teste l'intégration de paiement
   * @param centreId L'identifiant du centre
   * @returns Observable<boolean> True si le test a réussi
   */
  testPaymentIntegration(centreId: string): Observable<boolean> {
    return this.http.post<boolean>(
      `${this.apiUrl}/${centreId}/system/integrations/payment/test`,
      {}
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Teste l'intégration email
   * @param centreId L'identifiant du centre
   * @param testEmail L'email de test
   * @returns Observable<boolean> True si le test a réussi
   */
  testEmailIntegration(centreId: string, testEmail: string): Observable<boolean> {
    return this.http.post<boolean>(
      `${this.apiUrl}/${centreId}/system/integrations/email/test`,
      {},
      { params: { testEmail } }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Teste l'intégration SMS
   * @param centreId L'identifiant du centre
   * @param testPhoneNumber Le numéro de téléphone de test
   * @returns Observable<boolean> True si le test a réussi
   */
  testSmsIntegration(centreId: string, testPhoneNumber: string): Observable<boolean> {
    return this.http.post<boolean>(
      `${this.apiUrl}/${centreId}/system/integrations/sms/test`,
      {},
      { params: { testPhoneNumber } }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les paramètres de maintenance
   * @param centreId L'identifiant du centre
   * @returns Observable<MaintenanceSettings> Les paramètres de maintenance
   */
  getMaintenanceSettings(centreId: string): Observable<MaintenanceSettings> {
    return this.http.get<MaintenanceSettings>(
      `${this.apiUrl}/${centreId}/system/maintenance/settings`
    ).pipe(
      map(response => new MaintenanceSettings(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Met à jour les paramètres de maintenance
   * @param centreId L'identifiant du centre
   * @param settings Les nouveaux paramètres
   * @returns Observable<MaintenanceSettings> Les paramètres mis à jour
   */
  updateMaintenanceSettings(
    centreId: string,
    settings: MaintenanceSettings
  ): Observable<MaintenanceSettings> {
    return this.http.put<MaintenanceSettings>(
      `${this.apiUrl}/${centreId}/system/maintenance/settings`,
      settings
    ).pipe(
      map(response => new MaintenanceSettings(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Crée une sauvegarde
   * @param centreId L'identifiant du centre
   * @returns Observable<boolean> True si la sauvegarde a réussi
   */
  createBackup(centreId: string): Observable<boolean> {
    return this.http.post<boolean>(
      `${this.apiUrl}/${centreId}/system/backup`,
      {}
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère la liste des sauvegardes disponibles
   * @param centreId L'identifiant du centre
   * @returns Observable<string[]> Liste des noms de sauvegardes
   */
  getAvailableBackups(centreId: string): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.apiUrl}/${centreId}/system/backups`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Restaure une sauvegarde
   * @param centreId L'identifiant du centre
   * @param backupFileName Le nom du fichier de sauvegarde
   * @returns Observable<boolean> True si la restauration a réussi
   */
  restoreBackup(centreId: string, backupFileName: string): Observable<boolean> {
    return this.http.post<boolean>(
      `${this.apiUrl}/${centreId}/system/backups/restore`,
      {},
      { params: { backupFileName } }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Exporte les paramètres
   * @param centreId L'identifiant du centre
   * @param fileType Le format d'export (json, xml, etc.)
   * @returns Observable<Blob> Le fichier exporté
   */
  exportSettings(centreId: string, fileType: string = 'json'): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/${centreId}/export`,
      {
        params: { fileType },
        responseType: 'blob'
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Importe des paramètres
   * @param centreId L'identifiant du centre
   * @param fileType Le format du fichier (json, xml, etc.)
   * @param file Le fichier à importer
   * @returns Observable<boolean> True si l'import a réussi
   */
  importSettings(
    centreId: string,
    fileType: string,
    file: File
  ): Observable<boolean> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<boolean>(
      `${this.apiUrl}/${centreId}/import`,
      formData,
      { params: { fileType } }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Journalise un changement de paramètres
   * @param centreId L'identifiant du centre
   * @param section La section modifiée
   * @param action L'action effectuée
   * @param details Détails supplémentaires
   * @param modifiedBy L'utilisateur ayant effectué la modification
   * @returns Observable<boolean> True si la journalisation a réussi
   */
  logSettingsChange(
    centreId: string,
    section: string,
    action: string,
    details: string,
    modifiedBy: string
  ): Observable<boolean> {
    return this.http.post<boolean>(
      `${this.apiUrl}/${centreId}/audit/log`,
      {},
      { params: { section, action, details, modifiedBy } }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère l'historique des modifications
   * @param centreId L'identifiant du centre
   * @param startDate Date de début (optionnelle)
   * @param endDate Date de fin (optionnelle)
   * @returns Observable<SettingsAuditLog[]> Liste des entrées d'historique
   */
  // getSettingsHistory(
  //   centreId: string,
  //   startDate?: Date,
  //   endDate?: Date
  // ): Observable<SettingsAuditLog[]> {
  //   let params: any = {};
  //   if (startDate) params.startDate = startDate.toISOString();
  //   if (endDate) params.endDate = endDate.toISOString();

  //   return this.http.get<SettingsAuditLog[]>(
  //     `${this.apiUrl}/${centreId}/audit`,
  //     { params }
  //   ).pipe(
  //     map(response => response.map(log => new SettingsAuditLog(log))),
  //     catchError(this.handleError)
  //   );
  // }

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

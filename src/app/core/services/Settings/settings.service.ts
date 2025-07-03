import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApplicationSettings } from '../../models/Settings/ApplicationSettings';
import { DiscountRule } from '../../models/Settings/DiscountRule';
import { ScheduleSettings } from '../../models/Settings/ScheduleSettings';
import {
  ServiceCategory,
  ServiceSetting,
} from '../../models/Settings/ServiceSetting';
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
import {
  NotificationRule,
  NotificationChannel,
} from '../../models/Settings/NotificationRule';
import { SecuritySettings } from '../../models/Settings/SecuritySettings';
import { VehicleTypeConfiguration } from '../../models/Settings/VehicleTypeConfiguration';
import { VehicleType } from '../../models/Vehicles/VehicleType';

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
    'Maintenance',
  ];

  constructor(private http: HttpClient) {}

  // ==============================================
  // GESTION DES HORAIRES
  // ==============================================

  /**
   * Récupérer les paramètres d'horaire d'un centre
   * @param centreId ID du centre
   */
  getScheduleSettings(
    centreId?: string,
    isAdmin: boolean = false
  ): Observable<ScheduleSettings> {
    console.log(
      '🌐 Service getScheduleSettings appelé avec centreId:',
      centreId,
      'isAdmin:',
      isAdmin
    );

    // Si c'est un administrateur sans centreId spécifique
    if (isAdmin && (!centreId || centreId === 'string')) {
      console.log(
        '👑 Utilisateur administrateur détecté - retour des paramètres par défaut'
      );
      return this.getDefaultScheduleSettings();
    }

    // Validation stricte du centreId pour les utilisateurs normaux
    if (!centreId || typeof centreId !== 'string' || centreId.trim() === '') {
      const error = new Error(
        'CentreId is required and must be a valid string'
      );
      console.error('❌ CentreId invalide:', centreId);
      return throwError(() => error);
    }

    // Vérifier que ce n'est pas la string littérale "string"
    if (centreId === 'string') {
      const error = new Error('CentreId cannot be the literal string "string"');
      console.error('❌ CentreId est la string littérale "string"');
      return throwError(() => error);
    }

    // Nettoyer le centreId
    const cleanCentreId = centreId.trim();

    // Construire l'URL
    const url = `${this.apiUrl}/${cleanCentreId}/schedule`;
    console.log('🌐 URL construite:', url);

    return this.http.get<ScheduleSettings>(url).pipe(
      map((response) => {
        console.log('✅ Réponse reçue:', response);
        return new ScheduleSettings(response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Erreur HTTP dans getScheduleSettings:', error);
        console.error('❌ URL utilisée:', url);
        console.error('❌ CentreId utilisé:', cleanCentreId);
        return this.handleError(error);
      })
    );
  }

  /**
   * Retourne les paramètres d'horaire par défaut pour les administrateurs
   */
  private getDefaultScheduleSettings(): Observable<ScheduleSettings> {
    const defaultSettings = new ScheduleSettings({
      weeklySchedule: new Map([
        [
          DayOfWeek.Monday,
          new DaySchedule({
            isOpen: true,
            openTime: '08:00',
            closeTime: '18:00',
            breaks: [],
          }),
        ],
        [
          DayOfWeek.Tuesday,
          new DaySchedule({
            isOpen: true,
            openTime: '08:00',
            closeTime: '18:00',
            breaks: [],
          }),
        ],
        [
          DayOfWeek.Wednesday,
          new DaySchedule({
            isOpen: true,
            openTime: '08:00',
            closeTime: '18:00',
            breaks: [],
          }),
        ],
        [
          DayOfWeek.Thursday,
          new DaySchedule({
            isOpen: true,
            openTime: '08:00',
            closeTime: '18:00',
            breaks: [],
          }),
        ],
        [
          DayOfWeek.Friday,
          new DaySchedule({
            isOpen: true,
            openTime: '08:00',
            closeTime: '18:00',
            breaks: [],
          }),
        ],
        [
          DayOfWeek.Saturday,
          new DaySchedule({
            isOpen: false,
            openTime: '08:00',
            closeTime: '17:00',
            breaks: [],
          }),
        ],
        [
          DayOfWeek.Sunday,
          new DaySchedule({
            isOpen: false,
            openTime: '08:00',
            closeTime: '17:00',
            breaks: [],
          }),
        ],
      ]),
      is24Hours: false,
      defaultOpenTime: '08:00',
      defaultCloseTime: '18:00',
    });

    return of(defaultSettings);
  }

  /**
   * Récupérer les paramètres d'horaire de tous les centres (pour les administrateurs)
   */
  getAllCentresScheduleSettings(): Observable<
    { centreId: string; centreName: string; settings: ScheduleSettings }[]
  > {
    const url = `${this.apiUrl}/all-centres/schedule`;
    return this.http
      .get<
        { centreId: string; centreName: string; settings: ScheduleSettings }[]
      >(url)
      .pipe(
        map((response) =>
          response.map((item) => ({
            ...item,
            settings: new ScheduleSettings(item.settings),
          }))
        ),
        catchError(this.handleError)
      );
  }

  /**
   * Mettre à jour les paramètres d'horaire d'un centre spécifique (pour les administrateurs)
   * @param centreId ID du centre
   * @param scheduleSettings Nouveaux paramètres d'horaire
   */
  updateScheduleSettingsForCentre(
    centreId: string,
    scheduleSettings: ScheduleSettings
  ): Observable<ScheduleSettings> {
    if (!centreId || centreId === 'string') {
      const error = new Error(
        'CentreId is required for updating schedule settings'
      );
      return throwError(() => error);
    }

    return this.http
      .put<ScheduleSettings>(
        `${this.apiUrl}/${centreId}/schedule`,
        scheduleSettings
      )
      .pipe(
        map((response) => new ScheduleSettings(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Mettre à jour les paramètres d'horaire complets d'un centre
   * @param centreId ID du centre
   * @param scheduleSettings Nouveaux paramètres d'horaire
   */
  updateScheduleSettings(
    centreId: string,
    scheduleSettings: ScheduleSettings
  ): Observable<ScheduleSettings> {
    const payload = this.prepareScheduleSettingsForBackend(scheduleSettings);
    console.log('Payload envoyé:', JSON.stringify(payload, null, 2));

    return this.http
      .put<ScheduleSettings>(`${this.apiUrl}/${centreId}/schedule`, payload)
      .pipe(
        map((response) => new ScheduleSettings(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Préparer les données ScheduleSettings pour le backend
   */
  private prepareScheduleSettingsForBackend(
    scheduleSettings: ScheduleSettings
  ): any {
    const ensureTimeFormat = (time: string | undefined): string => {
      if (!time) return '08:00:00'; // Valeur par défaut

      // Formatage cohérent pour le backend
      if (time.includes(':') && time.split(':').length === 2) {
        return `${time}:00`;
      }
      return time;
    };

    const weeklyScheduleObj: { [key: string]: any } = {};

    // Initialiser tous les jours de la semaine avec des valeurs par défaut
    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    days.forEach((day) => {
      const daySchedule =
        scheduleSettings.weeklySchedule.get(day as DayOfWeek) ||
        new DaySchedule();
      weeklyScheduleObj[day] = {
        isOpen: daySchedule.isOpen,
        openTime: ensureTimeFormat(daySchedule.openTime),
        closeTime: ensureTimeFormat(daySchedule.closeTime),
        breaks: daySchedule.breaks.map((b) => ({
          startTime: ensureTimeFormat(b.startTime),
          endTime: ensureTimeFormat(b.endTime),
          description: b.description || '',
        })),
      };
    });

    return {
      weeklySchedule: weeklyScheduleObj,
      specialDays: scheduleSettings.specialDays.map((s) => ({
        date: s.date,
        isClosed: s.isClosed ?? false,
        specialOpenTime: s.specialOpenTime
          ? ensureTimeFormat(s.specialOpenTime)
          : null,
        specialCloseTime: s.specialCloseTime
          ? ensureTimeFormat(s.specialCloseTime)
          : null,
        reason: s.reason || '',
      })),
      is24Hours: scheduleSettings.is24Hours ?? false,
      defaultOpenTime: ensureTimeFormat(scheduleSettings.defaultOpenTime),
      defaultCloseTime: ensureTimeFormat(scheduleSettings.defaultCloseTime),
    };
  }

  private formatTimeForBackend(time: string): string {
    // Convertir "HH:mm" en "HH:mm:00" pour TimeSpan
    if (time && time.match(/^\d{2}:\d{2}$/)) {
      return `${time}:00`;
    }
    return time || '00:00:00';
  }

  /**
   * Mettre à jour l'horaire d'un jour spécifique
   * @param centreId ID du centre
   * @param dayOfWeek Jour de la semaine à modifier
   * @param daySchedule Nouvel horaire pour ce jour
   */
  updateDaySchedule(
    centreId: string,
    dayOfWeek: DayOfWeek,
    daySchedule: DaySchedule
  ): Observable<boolean> {
    return this.http
      .put<{ success: boolean }>(
        `${this.apiUrl}/${centreId}/schedule/days/${dayOfWeek}`,
        daySchedule
      )
      .pipe(
        map((response) => response.success),
        catchError(this.handleError)
      );
  }

  /**
   * Ajouter un jour spécial à l'horaire
   * @param centreId ID du centre
   * @param specialSchedule Configuration du jour spécial
   */
  addSpecialSchedule(
    centreId: string,
    specialSchedule: SpecialSchedule
  ): Observable<boolean> {
    return this.http
      .post<{ success: boolean }>(
        `${this.apiUrl}/${centreId}/schedule/special-days`,
        specialSchedule
      )
      .pipe(
        map((response) => response.success),
        catchError(this.handleError)
      );
  }

  /**
   * Supprimer un jour spécial de l'horaire
   * @param centreId ID du centre
   * @param date Date du jour spécial à supprimer
   */
  removeSpecialSchedule(centreId: string, date: Date): Observable<boolean> {
    return this.http
      .delete<{ success: boolean }>(
        `${this.apiUrl}/${centreId}/schedule/special-days`,
        { params: { date: date.toISOString() } }
      )
      .pipe(
        map((response) => response.success),
        catchError(this.handleError)
      );
  }

  /**
   * Récupérer les jours spéciaux dans une période donnée
   * @param centreId ID du centre
   * @param startDate Date de début (optionnelle)
   * @param endDate Date de fin (optionnelle)
   */
  getSpecialSchedules(
    centreId: string,
    startDate?: Date,
    endDate?: Date
  ): Observable<SpecialSchedule[]> {
    let params = {};
    if (startDate) params = { ...params, startDate: startDate.toISOString() };
    if (endDate) params = { ...params, endDate: endDate.toISOString() };

    return this.http
      .get<SpecialSchedule[]>(
        `${this.apiUrl}/${centreId}/schedule/special-days`,
        { params }
      )
      .pipe(
        map((response) => response.map((s) => new SpecialSchedule(s))),
        catchError(this.handleError)
      );
  }

  /**
   * Vérifier si le centre est ouvert à une date/heure donnée
   * @param centreId ID du centre
   * @param dateTime Date et heure à vérifier
   */
  isOpen(centreId: string, dateTime: Date): Observable<boolean> {
    return this.http
      .get<boolean>(`${this.apiUrl}/${centreId}/schedule/is-open`, {
        params: { dateTime: dateTime.toISOString() },
      })
      .pipe(catchError(this.handleError));
  }

  // 1. Récupérer les paramètres d'un centre
  getSettings(centreId: string): Observable<ApplicationSettings> {
    return this.http
      .get<ApplicationSettings>(`${this.apiUrl}/${centreId}`)
      .pipe(
        map((response) => new ApplicationSettings(response)),
        catchError(this.handleError)
      );
  }

  /**
   *  Mettre à jour les paramètres d'un centre
   * @param centreId
   * @param settings
   * @returns
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
   * Créer des paramètres par défaut pour un centre
   * @param centreId
   * @returns
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
   * Réinitialiser les paramètres par défaut
   * @param centreId
   * @returns
   */
  resetToDefault(centreId: string): Observable<boolean> {
    return this.http
      .put<boolean>(`${this.apiUrl}/${centreId}/reset`, {})
      .pipe(catchError(this.handleError));
  }

  /**
   * Supprimer les paramètres d'un centre
   * @param centreId
   * @returns
   */
  deleteSettings(centreId: string): Observable<boolean> {
    return this.http
      .delete<boolean>(`${this.apiUrl}/${centreId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupérer tous les services d'un centre
   * @param centreId
   * @returns
   */
  getServices(centreId: string): Observable<ServiceSetting[]> {
    return this.http
      .get<ServiceSetting[]>(`${this.apiUrl}/${centreId}/services`)
      .pipe(
        map((response) => response.map((s) => new ServiceSetting(s))),
        catchError(this.handleError)
      );
  }

  /**
   * Créer un nouveau service
   * @param centreId
   * @param service
   * @returns
   */
  createService(
    centreId: string,
    serviceData: any
  ): Observable<ServiceSetting> {
    // Ajouter des logs pour debug
    console.log("Données envoyées à l'API:", serviceData);

    return this.http
      .post<ServiceSetting>(`${this.apiUrl}/${centreId}/services`, serviceData)
      .pipe(
        map((response) => new ServiceSetting(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère un service spécifique par son ID
   * @param centreId L'identifiant du centre
   * @param serviceId L'identifiant du service
   * @returns Observable<ServiceSetting> Le service demandé
   */
  getServiceById(
    centreId: string,
    serviceId: string
  ): Observable<ServiceSetting> {
    return this.http
      .get<ServiceSetting>(`${this.apiUrl}/${centreId}/services/${serviceId}`)
      .pipe(
        map((response) => new ServiceSetting(response)),
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
  updateService(
    centreId: string,
    serviceId: string,
    service: ServiceSetting
  ): Observable<ServiceSetting> {
    return this.http
      .put<ServiceSetting>(
        `${this.apiUrl}/${centreId}/services/${serviceId}`,
        service
      )
      .pipe(
        map((response) => new ServiceSetting(response)),
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
    return this.http
      .delete<boolean>(`${this.apiUrl}/${centreId}/services/${serviceId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Active ou désactive un service
   * @param centreId L'identifiant du centre
   * @param serviceId L'identifiant du service
   * @returns Observable<boolean> Le nouveau statut (true = actif)
   */
  toggleServiceStatus(
    centreId: string,
    serviceId: string
  ): Observable<boolean> {
    return this.http
      .patch<{ isActive: boolean }>(
        `${this.apiUrl}/${centreId}/services/${serviceId}/toggle`,
        {}
      )
      .pipe(
        map((response) => response.isActive),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les services par catégorie
   * @param centreId L'identifiant du centre
   * @param category La catégorie de service
   * @returns Observable<ServiceSetting[]> Liste des services de la catégorie
   */
  getServicesByCategory(
    centreId: string,
    category: ServiceCategory
  ): Observable<ServiceSetting[]> {
    return this.http
      .get<ServiceSetting[]>(
        `${this.apiUrl}/${centreId}/services/category/${category}`
      )
      .pipe(
        map((response) => response.map((s) => new ServiceSetting(s))),
        catchError(this.handleError)
      );
  }

  /**
   * Réorganise l'ordre des services
   * @param centreId L'identifiant du centre
   * @param serviceOrders Dictionnaire ID service -> nouvel ordre
   * @returns Observable<boolean> True si la réorganisation a réussi
   */
  reorderServices(
    centreId: string,
    serviceOrders: { [key: string]: number }
  ): Observable<boolean> {
    return this.http
      .put<boolean>(
        `${this.apiUrl}/${centreId}/services/reorder`,
        serviceOrders
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupère les paramètres de tarification
   * @param centreId L'identifiant du centre
   * @returns Observable<PricingSettings> Les paramètres de tarification
   */
  getPricingSettings(centreId: string): Observable<PricingSettings> {
    return this.http
      .get<PricingSettings>(`${this.apiUrl}/${centreId}/pricing`)
      .pipe(
        map((response) => new PricingSettings(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Met à jour les paramètres de tarification
   * @param centreId L'identifiant du centre
   * @param pricing Les nouveaux paramètres
   * @returns Observable<PricingSettings> Les paramètres mis à jour
   */
  updatePricingSettings(
    centreId: string,
    pricing: PricingSettings
  ): Observable<PricingSettings> {
    return this.http
      .put<PricingSettings>(`${this.apiUrl}/${centreId}/pricing`, pricing)
      .pipe(
        map((response) => new PricingSettings(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère la tarification d'un service spécifique
   * @param centreId L'identifiant du centre
   * @param serviceId L'identifiant du service
   * @returns Observable<ServicePricing> La tarification du service
   */
  getServicePricing(
    centreId: string,
    serviceId: string
  ): Observable<ServicePricing> {
    return this.http
      .get<ServicePricing>(
        `${this.apiUrl}/${centreId}/pricing/services/${serviceId}`
      )
      .pipe(
        map((response) => new ServicePricing(response)),
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
    return this.http
      .put<ServicePricing>(
        `${this.apiUrl}/${centreId}/pricing/services/${serviceId}`,
        pricing
      )
      .pipe(
        map((response) => new ServicePricing(response)),
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
   * Récupère la tarification par zone
   * @param centreId L'identifiant du centre
   * @returns Observable<ZonePricing[]> Liste des tarifications par zone
   */
  getZonePricing(centreId: string): Observable<ZonePricing[]> {
    return this.http
      .get<ZonePricing[]>(`${this.apiUrl}/${centreId}/pricing/zones`)
      .pipe(
        map((response) => response.map((z) => new ZonePricing(z))),
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
    return this.http
      .post<ZonePricing>(
        `${this.apiUrl}/${centreId}/pricing/zones`,
        zonePricing
      )
      .pipe(
        map((response) => new ZonePricing(response)),
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
    return this.http
      .put<ZonePricing>(
        `${this.apiUrl}/${centreId}/pricing/zones/${zoneName}`,
        zonePricing
      )
      .pipe(
        map((response) => new ZonePricing(response)),
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
    return this.http
      .delete<boolean>(`${this.apiUrl}/${centreId}/pricing/zones/${zoneName}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupère toutes les règles de remise
   * @param centreId L'identifiant du centre
   * @returns Observable<DiscountRule[]> Liste des règles de remise
   */
  getDiscountRules(centreId: string): Observable<DiscountRule[]> {
    return this.http
      .get<DiscountRule[]>(`${this.apiUrl}/${centreId}/pricing/discount-rules`)
      .pipe(
        map((response) => response.map((d) => new DiscountRule(d))),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère une règle de remise spécifique
   * @param centreId L'identifiant du centre
   * @param discountId L'identifiant de la remise
   * @returns Observable<DiscountRule> La règle de remise demandée
   */
  getDiscountRuleById(
    centreId: string,
    discountId: string
  ): Observable<DiscountRule> {
    return this.http
      .get<DiscountRule>(
        `${this.apiUrl}/${centreId}/pricing/discount-rules/${discountId}`
      )
      .pipe(
        map((response) => new DiscountRule(response)),
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
    return this.http
      .post<DiscountRule>(
        `${this.apiUrl}/${centreId}/pricing/discount-rules`,
        discountRule
      )
      .pipe(
        map((response) => new DiscountRule(response)),
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
    return this.http
      .put<DiscountRule>(
        `${this.apiUrl}/${centreId}/pricing/discount-rules/${discountId}`,
        discountRule
      )
      .pipe(
        map((response) => new DiscountRule(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Supprime une règle de remise
   * @param centreId L'identifiant du centre
   * @param discountId L'identifiant de la remise
   * @returns Observable<boolean> True si la suppression a réussi
   */
  deleteDiscountRule(
    centreId: string,
    discountId: string
  ): Observable<boolean> {
    return this.http
      .delete<boolean>(
        `${this.apiUrl}/${centreId}/pricing/discount-rules/${discountId}`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Active/désactive une règle de remise
   * @param centreId L'identifiant du centre
   * @param discountId L'identifiant de la remise
   * @returns Observable<boolean> Le nouveau statut (true = actif)
   */
  toggleDiscountRuleStatus(
    centreId: string,
    discountId: string
  ): Observable<boolean> {
    return this.http
      .patch<{ isActive: boolean }>(
        `${this.apiUrl}/${centreId}/pricing/discount-rules/${discountId}/toggle`,
        {}
      )
      .pipe(
        map((response) => response.isActive),
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

    return this.http
      .get<DiscountRule[]>(
        `${this.apiUrl}/${centreId}/pricing/discount-rules/active`,
        { params }
      )
      .pipe(
        map((response) => response.map((d) => new DiscountRule(d))),
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
      sessionCount: sessionCount.toString(),
    };

    return this.http
      .get<{ discount: number }>(
        `${this.apiUrl}/${centreId}/pricing/calculate-discount`,
        { params }
      )
      .pipe(
        map((response) => response.discount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les paramètres généraux du système
   * @param centreId L'identifiant du centre
   * @returns Observable<GeneralSettings> Les paramètres généraux
   */
  getGeneralSettings(centreId: string): Observable<GeneralSettings> {
    return this.http
      .get<GeneralSettings>(`${this.apiUrl}/${centreId}/system/general`)
      .pipe(
        map((response) => new GeneralSettings(response)),
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
    return this.http
      .put<GeneralSettings>(
        `${this.apiUrl}/${centreId}/system/general`,
        settings
      )
      .pipe(
        map((response) => new GeneralSettings(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les paramètres de notification
   * @param centreId L'identifiant du centre
   * @returns Observable<NotificationSettings> Les paramètres de notification
   */
  getNotificationSettings(centreId: string): Observable<NotificationSettings> {
    return this.http
      .get<NotificationSettings>(
        `${this.apiUrl}/${centreId}/system/notifications`
      )
      .pipe(
        map((response) => new NotificationSettings(response)),
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
    return this.http
      .put<NotificationSettings>(
        `${this.apiUrl}/${centreId}/system/notifications`,
        settings
      )
      .pipe(
        map((response) => new NotificationSettings(response)),
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
    return this.http
      .post<NotificationRule>(
        `${this.apiUrl}/${centreId}/system/notifications/rules`,
        rule
      )
      .pipe(
        map((response) => new NotificationRule(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Supprime une règle de notification
   * @param centreId L'identifiant du centre
   * @param eventType Le type d'événement de la règle à supprimer
   * @returns Observable<boolean> True si la suppression a réussi
   */
  deleteNotificationRule(
    centreId: string,
    eventType: string
  ): Observable<boolean> {
    return this.http
      .delete<boolean>(
        `${this.apiUrl}/${centreId}/system/notifications/rules/${eventType}`
      )
      .pipe(catchError(this.handleError));
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
    return this.http
      .post<boolean>(
        `${this.apiUrl}/${centreId}/system/notifications/test`,
        {},
        { params: { eventType, channel } }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupère les paramètres de sécurité
   * @param centreId L'identifiant du centre
   * @returns Observable<SecuritySettings> Les paramètres de sécurité
   */
  getSecuritySettings(centreId: string): Observable<SecuritySettings> {
    return this.http
      .get<SecuritySettings>(`${this.apiUrl}/${centreId}/system/security`)
      .pipe(
        map((response) => new SecuritySettings(response)),
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
    return this.http
      .put<SecuritySettings>(
        `${this.apiUrl}/${centreId}/system/security`,
        settings
      )
      .pipe(
        map((response) => new SecuritySettings(response)),
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
    return this.http
      .get<{ isValid: boolean }>(
        `${this.apiUrl}/${centreId}/system/security/validate-ip`,
        { params: { ipAddress } }
      )
      .pipe(
        map((response) => response.isValid),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les paramètres d'intégration
   * @param centreId L'identifiant du centre
   * @returns Observable<IntegrationSettings> Les paramètres d'intégration
   */
  getIntegrationSettings(centreId: string): Observable<IntegrationSettings> {
    return this.http
      .get<IntegrationSettings>(
        `${this.apiUrl}/${centreId}/system/integrations`
      )
      .pipe(
        map((response) => new IntegrationSettings(response)),
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
    return this.http
      .put<IntegrationSettings>(
        `${this.apiUrl}/${centreId}/system/integrations`,
        settings
      )
      .pipe(
        map((response) => new IntegrationSettings(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Teste l'intégration de paiement
   * @param centreId L'identifiant du centre
   * @returns Observable<boolean> True si le test a réussi
   */
  testPaymentIntegration(centreId: string): Observable<boolean> {
    return this.http
      .post<boolean>(
        `${this.apiUrl}/${centreId}/system/integrations/payment/test`,
        {}
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Teste l'intégration email
   * @param centreId L'identifiant du centre
   * @param testEmail L'email de test
   * @returns Observable<boolean> True si le test a réussi
   */
  testEmailIntegration(
    centreId: string,
    testEmail: string
  ): Observable<boolean> {
    return this.http
      .post<boolean>(
        `${this.apiUrl}/${centreId}/system/integrations/email/test`,
        {},
        { params: { testEmail } }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Teste l'intégration SMS
   * @param centreId L'identifiant du centre
   * @param testPhoneNumber Le numéro de téléphone de test
   * @returns Observable<boolean> True si le test a réussi
   */
  testSmsIntegration(
    centreId: string,
    testPhoneNumber: string
  ): Observable<boolean> {
    return this.http
      .post<boolean>(
        `${this.apiUrl}/${centreId}/system/integrations/sms/test`,
        {},
        { params: { testPhoneNumber } }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupère les paramètres de maintenance
   * @param centreId L'identifiant du centre
   * @returns Observable<MaintenanceSettings> Les paramètres de maintenance
   */
  getMaintenanceSettings(centreId: string): Observable<MaintenanceSettings> {
    return this.http
      .get<MaintenanceSettings>(
        `${this.apiUrl}/${centreId}/system/maintenance/settings`
      )
      .pipe(
        map((response) => new MaintenanceSettings(response)),
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
    return this.http
      .put<MaintenanceSettings>(
        `${this.apiUrl}/${centreId}/system/maintenance/settings`,
        settings
      )
      .pipe(
        map((response) => new MaintenanceSettings(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Crée une sauvegarde
   * @param centreId L'identifiant du centre
   * @returns Observable<boolean> True si la sauvegarde a réussi
   */
  createBackup(centreId: string): Observable<boolean> {
    return this.http
      .post<boolean>(`${this.apiUrl}/${centreId}/system/backup`, {})
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupère la liste des sauvegardes disponibles
   * @param centreId L'identifiant du centre
   * @returns Observable<string[]> Liste des noms de sauvegardes
   */
  getAvailableBackups(centreId: string): Observable<string[]> {
    return this.http
      .get<string[]>(`${this.apiUrl}/${centreId}/system/backups`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Restaure une sauvegarde
   * @param centreId L'identifiant du centre
   * @param backupFileName Le nom du fichier de sauvegarde
   * @returns Observable<boolean> True si la restauration a réussi
   */
  restoreBackup(centreId: string, backupFileName: string): Observable<boolean> {
    return this.http
      .post<boolean>(
        `${this.apiUrl}/${centreId}/system/backups/restore`,
        {},
        { params: { backupFileName } }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Exporte les paramètres
   * @param centreId L'identifiant du centre
   * @param fileType Le format d'export (json, xml, etc.)
   * @returns Observable<Blob> Le fichier exporté
   */
  exportSettings(
    centreId: string,
    fileType: string = 'json'
  ): Observable<Blob> {
    return this.http
      .get(`${this.apiUrl}/${centreId}/export`, {
        params: { fileType },
        responseType: 'blob',
      })
      .pipe(catchError(this.handleError));
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

    return this.http
      .post<boolean>(`${this.apiUrl}/${centreId}/import`, formData, {
        params: { fileType },
      })
      .pipe(catchError(this.handleError));
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
    return this.http
      .post<boolean>(
        `${this.apiUrl}/${centreId}/audit/log`,
        {},
        { params: { section, action, details, modifiedBy } }
      )
      .pipe(catchError(this.handleError));
  }

  // ==============================================
  // Gestion des types de véhicules (globaux)
  // ==============================================

  /**
   * Récupère tous les types de véhicules disponibles
   */
  getAllVehicleTypes(): Observable<VehicleType[]> {
    return this.http.get<VehicleType[]>(`${this.apiUrl}/vehicle-types`).pipe(
      map((types) => types.map((t) => new VehicleType(t))),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère un type de véhicule par son ID
   * @param vehicleTypeId ID du type de véhicule
   */
  getVehicleTypeById(vehicleTypeId: string): Observable<VehicleType> {
    return this.http
      .get<VehicleType>(`${this.apiUrl}/vehicle-types/${vehicleTypeId}`)
      .pipe(
        map((type) => new VehicleType(type)),
        catchError(this.handleError)
      );
  }

  /**
   * Crée un nouveau type de véhicule
   * @param vehicleType Données du type de véhicule à créer
   */
  createVehicleType(vehicleType: VehicleType): Observable<VehicleType> {
    // Votre API exige un Id même pour la création - générer un GUID/UUID
    const vehicleTypeData = {
      id: this.generateGuid(), // Générer un GUID unique
      label: vehicleType.label,
      description: vehicleType.description,
      size: vehicleType.size,
      iconUrl: vehicleType.iconUrl,
      defaultSizeMultiplier: vehicleType.defaultSizeMultiplier,
      defaultSortOrder: vehicleType.defaultSortOrder,
      isActive: vehicleType.isActive,
      isGlobalType: vehicleType.isGlobalType,
    };

    return this.http
      .post<VehicleType>(`${this.apiUrl}/vehicle-types`, vehicleTypeData)
      .pipe(
        map((type) => new VehicleType(type)),
        catchError(this.handleError)
      );
  }

  // Méthode pour générer un GUID/UUID compatible avec votre backend
  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  /**
   * Met à jour un type de véhicule existant
   * @param vehicleTypeId ID du type de véhicule à mettre à jour
   * @param vehicleType Données mises à jour
   */
  updateVehicleType(
    id: string,
    vehicleType: VehicleType
  ): Observable<VehicleType> {
    const vehicleTypeData = {
      id: id,
      label: vehicleType.label,
      description: vehicleType.description,
      size: vehicleType.size,
      iconUrl: vehicleType.iconUrl,
      defaultSizeMultiplier: vehicleType.defaultSizeMultiplier,
      defaultSortOrder: vehicleType.defaultSortOrder,
      isActive: vehicleType.isActive,
      isGlobalType: vehicleType.isGlobalType,
      createdAt: vehicleType.createdAt,
      updatedAt: new Date(),
    };

    return this.http
      .put<VehicleType>(`${this.apiUrl}/vehicle-types/${id}`, vehicleTypeData)
      .pipe(
        map((type) => new VehicleType(type)),
        catchError(this.handleError)
      );
  }

  /**
   * Supprime un type de véhicule global
   * @param vehicleTypeId ID du type de véhicule à supprimer
   */
  deleteVehicleType(vehicleTypeId: string): Observable<boolean> {
    return this.http
      .delete<{ success: boolean }>(
        `${this.apiUrl}/vehicle-types/${vehicleTypeId}`
      )
      .pipe(
        map((response) => response.success),
        catchError(this.handleError)
      );
  }

  // ==============================================
  // Gestion des configurations par centre
  // ==============================================

  /**
   * Récupère la configuration d'un type de véhicule pour un centre spécifique
   * @param centreId ID du centre
   * @param vehicleTypeId ID du type de véhicule
   */
  getVehicleTypeConfiguration(
    centreId: string,
    vehicleTypeId: string
  ): Observable<VehicleTypeConfiguration> {
    return this.http
      .get<VehicleTypeConfiguration>(
        `${this.apiUrl}/${centreId}/vehicle-types/${vehicleTypeId}`
      )
      .pipe(
        map((config) => new VehicleTypeConfiguration(config)),
        catchError(this.handleError)
      );
  }

  /**
   * Met à jour la configuration d'un type de véhicule pour un centre
   * @param centreId ID du centre
   * @param vehicleTypeId ID du type de véhicule
   * @param config Configuration mise à jour
   */
  updateVehicleTypeConfiguration(
    centreId: string,
    vehicleTypeId: string,
    config: VehicleTypeConfiguration
  ): Observable<VehicleTypeConfiguration> {
    return this.http
      .put<VehicleTypeConfiguration>(
        `${this.apiUrl}/${centreId}/vehicle-types/${vehicleTypeId}`,
        config
      )
      .pipe(
        map((updatedConfig) => new VehicleTypeConfiguration(updatedConfig)),
        catchError(this.handleError)
      );
  }

  /**
   * Active ou désactive un type de véhicule pour un centre
   * @param centreId ID du centre
   * @param vehicleTypeId ID du type de véhicule
   */
  toggleVehicleTypeStatus(
    centreId: string,
    vehicleTypeId: string
  ): Observable<boolean> {
    return this.http
      .patch<{ isActive: boolean }>(
        `${this.apiUrl}/${centreId}/vehicle-types/${vehicleTypeId}/toggle`,
        {}
      )
      .pipe(
        map((response) => response.isActive),
        catchError(this.handleError)
      );
  }

  /**
   * Supprime la configuration d'un type de véhicule pour un centre
   * @param centreId ID du centre
   * @param vehicleTypeId ID du type de véhicule
   */
  deleteVehicleTypeConfiguration(
    centreId: string,
    vehicleTypeId: string
  ): Observable<boolean> {
    return this.http
      .delete<{ success: boolean }>(
        `${this.apiUrl}/${centreId}/vehicle-types/${vehicleTypeId}`
      )
      .pipe(
        map((response) => response.success),
        catchError(this.handleError)
      );
  }

  /**
   * Gère les erreurs HTTP
   * @param error - L'erreur survenue
   * @returns Observable<never> - Un observable qui émet l'erreur
   */
  private handleError(error: HttpErrorResponse) {
    console.error('Erreur complète:', error);

    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur client: ${error.error.message}`;
    } else {
      if (error.status === 400 && error.error.errors) {
        // Affichez les erreurs de validation
        const validationErrors = Object.values(error.error.errors).flat();
        errorMessage = `Erreurs de validation: ${validationErrors.join(', ')}`;
      } else if (error.error.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Erreur serveur (${error.status}): ${error.statusText}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}

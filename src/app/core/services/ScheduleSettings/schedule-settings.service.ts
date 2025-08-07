  import { Injectable } from '@angular/core';
  import { HttpClient } from '@angular/common/http';
  import { Observable } from 'rxjs';
  import { environment } from '../../../../environments/environment.development';
import { ApiResponseData } from '../../models/ApiResponseData';
import { DayOfWeek } from '../../models/Settings/DayOfWeek';
import { ScheduleSettings } from '../../models/Settings/Schedule/ScheduleSettings';

  /*****/
  /**
   * Interface pour représenter un TimeSpan (plage horaire)
   */
  interface TimeSpan {
    hours: number;
    minutes: number;
    seconds: number;
  }

  @Injectable({
    providedIn: 'root'
  })
  export class ScheduleSettingsService {
    private readonly baseUrl = `${environment.apiUrl}/api/schedulesettings`;

    constructor(private http: HttpClient) { }

    /*****/
    /**
     * Récupère les paramètres d'horaire d'un centre
     * @param centreId Identifiant du centre
     * @returns Observable contenant les paramètres d'horaire
     */
    getScheduleSettings(centreId: string): Observable<ApiResponseData<ScheduleSettings>> {
      return this.http.get<ApiResponseData<ScheduleSettings>>(`${this.baseUrl}/${centreId}`);
    }

    /*****/
    /**
     * Crée des paramètres d'horaire pour un centre
     * @param settings Les paramètres à créer
     * @returns Observable contenant les paramètres créés
     */
    createScheduleSettings(settings: ScheduleSettings): Observable<ApiResponseData<ScheduleSettings>> {
      return this.http.post<ApiResponseData<ScheduleSettings>>(this.baseUrl, settings);
    }

    /*****/
    /**
     * Met à jour les paramètres d'horaire d'un centre
     * @param settings Les nouveaux paramètres
     * @param updatedBy Identifiant de l'utilisateur effectuant la modification
     * @returns Observable contenant les paramètres mis à jour
     */
    updateScheduleSettings(settings: ScheduleSettings, updatedBy: string): Observable<ApiResponseData<ScheduleSettings>> {
      return this.http.put<ApiResponseData<ScheduleSettings>>(
        this.baseUrl,
        settings,
        { params: { updatedBy } }
      );
    }

    /*****/
    /**
     * Vérifie si un centre est ouvert à une date/heure donnée
     * @param centreId Identifiant du centre
     * @param dateTime Date et heure à vérifier
     * @returns Observable contenant un booléen indiquant si le centre est ouvert
     */
    isCentreOpen(centreId: string, dateTime: Date): Observable<ApiResponseData<boolean>> {
      return this.http.get<ApiResponseData<boolean>>(
        `${this.baseUrl}/is-open/${centreId}`,
        { params: { dateTime: dateTime.toISOString() } }
      );
    }

    /*****/
    /**
     * Vérifie si un créneau horaire est disponible
     * @param centreId Identifiant du centre
     * @param dateTime Date et heure du créneau
     * @returns Observable contenant un booléen indiquant la disponibilité
     */
    isTimeSlotAvailable(centreId: string, dateTime: Date): Observable<ApiResponseData<boolean>> {
      return this.http.get<ApiResponseData<boolean>>(
        `${this.baseUrl}/time-slot-available/${centreId}`,
        { params: { dateTime: dateTime.toISOString() } }
      );
    }

    /*****/
    /**
     * Récupère les créneaux horaires disponibles pour un jour donné
     * @param centreId Identifiant du centre
     * @param date Date à vérifier
     * @returns Observable contenant la liste des créneaux disponibles
     */
    getAvailableTimeSlots(centreId: string, date: Date): Observable<ApiResponseData<TimeSpan[]>> {
      return this.http.get<ApiResponseData<TimeSpan[]>>(
        `${this.baseUrl}/available-slots/${centreId}`,
        { params: { date: date.toISOString() } }
      );
    }

    /*****/
    /**
     * Récupère les jours d'ouverture d'un centre
     * @param centreId Identifiant du centre
     * @returns Observable contenant la liste des jours d'ouverture
     */
    getWorkingDays(centreId: string): Observable<ApiResponseData<DayOfWeek[]>> {
      return this.http.get<ApiResponseData<DayOfWeek[]>>(`${this.baseUrl}/working-days/${centreId}`);
    }

    /*****/
    /**
     * Récupère la durée par défaut d'un lavage
     * @param centreId Identifiant du centre
     * @returns Observable contenant la durée en minutes
     */
    getDefaultWashDuration(centreId: string): Observable<ApiResponseData<number>> {
      return this.http.get<ApiResponseData<number>>(`${this.baseUrl}/wash-duration/${centreId}`);
    }

    /*****/
    /**
     * Récupère le nombre maximal de lavages simultanés
     * @param centreId Identifiant du centre
     * @returns Observable contenant le nombre maximal
     */
    getMaxConcurrentWashes(centreId: string): Observable<ApiResponseData<number>> {
      return this.http.get<ApiResponseData<number>>(`${this.baseUrl}/max-concurrent-washes/${centreId}`);
    }

    /*****/
    /**
     * Récupère les horaires d'ouverture/fermeture pour un jour donné
     * @param centreId Identifiant du centre
     * @param date Date à vérifier
     * @returns Observable contenant un tuple (ouverture, fermeture)
     */
    getDailySchedule(centreId: string, date: Date): Observable<ApiResponseData<{ openingTime: string, closingTime: string }>> {
      return this.http.get<ApiResponseData<{ openingTime: string, closingTime: string }>>(
        `${this.baseUrl}/daily-schedule/${centreId}`,
        { params: { date: date.toISOString() } }
      );
    }

    /*****/
    /**
     * Calcule l'heure de fin d'un lavage
     * @param centreId Identifiant du centre
     * @param startTime Heure de début du lavage
     * @returns Observable contenant l'heure de fin calculée
     */
    calculateWashEndTime(centreId: string, startTime: Date): Observable<ApiResponseData<Date>> {
      return this.http.get<ApiResponseData<Date>>(
        `${this.baseUrl}/calculate-end-time/${centreId}`,
        { params: { startTime: startTime.toISOString() } }
      );
    }

    /*****/
    /**
     * Vérifie si le travail le week-end est autorisé
     * @param centreId Identifiant du centre
     * @returns Observable contenant un booléen indiquant l'autorisation
     */
    isWeekendWorkAllowed(centreId: string): Observable<ApiResponseData<boolean>> {
      return this.http.get<ApiResponseData<boolean>>(`${this.baseUrl}/weekend-work-allowed/${centreId}`);
    }

    /*****/
    /**
     * Vérifie si les heures supplémentaires sont autorisées
     * @param centreId Identifiant du centre
     * @returns Observable contenant un booléen indiquant l'autorisation
     */
    isOvertimeAllowed(centreId: string): Observable<ApiResponseData<boolean>> {
      return this.http.get<ApiResponseData<boolean>>(`${this.baseUrl}/overtime-allowed/${centreId}`);
    }

    /*****/
    /**
     * Vérifie si une heure donnée correspond à la pause déjeuner
     * @param centreId Identifiant du centre
     * @param time Heure à vérifier (format TimeSpan)
     * @returns Observable contenant un booléen indiquant si c'est la pause déjeuner
     */
    isDuringLunchBreak(centreId: string, time: string): Observable<ApiResponseData<boolean>> {
      return this.http.get<ApiResponseData<boolean>>(
        `${this.baseUrl}/is-lunch-break/${centreId}`,
        { params: { time } }
      );
    }
  }

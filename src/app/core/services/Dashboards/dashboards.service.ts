import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiResponseData } from '../../models/ApiResponseData';
import { DashboardAlert } from '../../models/Dashboards/DashboardAlert';
import { DashboardKpiDto } from '../../models/Dashboards/DashboardKpiDto';
import { DashboardSnapshot } from '../../models/Dashboards/DashboardSnapshot';
import { WeeklyComparisonDto } from '../../models/Dashboards/WeeklyComparisonDto';

@Injectable({
  providedIn: 'root'
})
export class DashboardsService {
  private readonly baseUrl = `${environment.apiUrl}/api/Dashboard`;

  constructor(private http: HttpClient) { }



  //#region Endpoints Principaux

  /**
   * Récupère le snapshot complet du dashboard pour un centre spécifique
   * @param centreId ID du centre
   * @returns Observable contenant le snapshot du dashboard
   */
  getDashboardSnapshot(centreId: string): Observable<ApiResponseData<DashboardSnapshot>> {
    return this.http.get<ApiResponseData<DashboardSnapshot>>(
      `${this.baseUrl}/centre/${centreId}`
    ).pipe(
      catchError(this.handleError)
    );
  }



  getRevenueByService(centreId: string, params?: any): Observable<ApiResponseData<{ serviceName: string, revenue: number }[]>> {
  let queryParams = new HttpParams();

  if (params) {
    Object.keys(params).forEach(key => {
      if (params[key]) {
        queryParams = queryParams.append(key, params[key]);
      }
    });
  }

  return this.http.get<ApiResponseData<{ serviceName: string, revenue: number }[]>>(
    `${this.baseUrl}/${centreId}/revenue-by-service`,
    { params: queryParams }
  );
}

  /**
   * Force la mise à jour des données du dashboard pour un centre
   * @param centreId ID du centre
   * @returns Observable contenant le snapshot mis à jour
   */
  refreshDashboard(centreId: string): Observable<ApiResponseData<DashboardSnapshot>> {
    return this.http.post<ApiResponseData<DashboardSnapshot>>(
      `${this.baseUrl}/centre/${centreId}/refresh`,
      {}
    ).pipe(
      catchError(this.handleError)
    );
  }

  //#endregion

  //#region KPI et Métriques

  /**
   * Récupère les KPI principaux du dashboard
   * @param centreId ID du centre
   * @returns Observable contenant les KPI essentiels
   */
  getMainKpis(centreId: string): Observable<ApiResponseData<DashboardKpiDto>> {
    return this.http.get<ApiResponseData<DashboardKpiDto>>(
      `${this.baseUrl}/centre/${centreId}/kpis`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les revenus des 7 derniers jours
   * @param centreId ID du centre
   * @returns Observable contenant un tableau des revenus journaliers
   */
  getLast7DaysRevenue(centreId: string): Observable<ApiResponseData<number[]>> {
    return this.http.get<ApiResponseData<number[]>>(
      `${this.baseUrl}/centre/${centreId}/revenue/last7days`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère le nombre de lavages des 7 derniers jours
   * @param centreId ID du centre
   * @returns Observable contenant un tableau du nombre de lavages journaliers
   */
  getLast7DaysWashCount(centreId: string): Observable<ApiResponseData<number[]>> {
    return this.http.get<ApiResponseData<number[]>>(
      `${this.baseUrl}/centre/${centreId}/washes/last7days`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Compare les performances avec la semaine précédente
   * @param centreId ID du centre
   * @returns Observable contenant les données de comparaison hebdomadaire
   */
  getWeeklyComparison(centreId: string): Observable<ApiResponseData<WeeklyComparisonDto>> {
    return this.http.get<ApiResponseData<WeeklyComparisonDto>>(
      `${this.baseUrl}/centre/${centreId}/comparison/weekly`
    ).pipe(
      catchError(this.handleError)
    );
  }

  //#endregion

  //#region Gestion des Alertes

  /**
   * Récupère les alertes actives pour un centre
   * @param centreId ID du centre
   * @returns Observable contenant la liste des alertes non résolues
   */
  getActiveAlerts(centreId: string): Observable<ApiResponseData<DashboardAlert[]>> {
    return this.http.get<ApiResponseData<DashboardAlert[]>>(
      `${this.baseUrl}/centre/${centreId}/alerts/active`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Marque une alerte comme résolue
   * @param centreId ID du centre
   * @param alertIndex Index de l'alerte dans la liste
   * @returns Observable contenant le résultat de l'opération
   */
  resolveAlert(centreId: string, alertIndex: number): Observable<ApiResponseData<boolean>> {
    return this.http.post<ApiResponseData<boolean>>(
      `${this.baseUrl}/centre/${centreId}/alerts/${alertIndex}/resolve`,
      {}
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Résout toutes les alertes actives d'un centre
   * @param centreId ID du centre
   * @returns Observable contenant le nombre d'alertes résolues
   */
  resolveAllAlerts(centreId: string): Observable<ApiResponseData<number>> {
    return this.http.post<ApiResponseData<number>>(
      `${this.baseUrl}/centre/${centreId}/alerts/resolve-all`,
      {}
    ).pipe(
      catchError(this.handleError)
    );
  }

  //#endregion

  //#region Endpoints Statistiques Avancés

  /**
   * Récupère les statistiques de performance horaire pour aujourd'hui
   * @param centreId ID du centre
   * @returns Observable contenant les statistiques horaires
   */
  getHourlyStats(centreId: string): Observable<ApiResponseData<any>> {
    return this.http.get<ApiResponseData<any>>(
      `${this.baseUrl}/centre/${centreId}/stats/hourly`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les tendances mensuelles
   * @param centreId ID du centre
   * @param months Nombre de mois à inclure (défaut: 6)
   * @returns Observable contenant les tendances mensuelles
   */
  getMonthlyTrends(centreId: string, months: number = 6): Observable<ApiResponseData<any>> {
    return this.http.get<ApiResponseData<any>>(
      `${this.baseUrl}/centre/${centreId}/trends/monthly?months=${months}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  //#endregion

  //#region Gestion des erreurs

  /**
   * Gère les erreurs HTTP
   * @param error Erreur HTTP
   * @returns Observable avec message d'erreur
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur inconnue est survenue';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      errorMessage = `Code d'erreur: ${error.status}, Message: ${error.message}`;

      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      }
    }

    console.error('Erreur dans DashboardsService:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  //#endregion
}

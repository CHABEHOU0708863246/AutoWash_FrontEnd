// profitability.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiResponseData } from '../../models/ApiResponseData';
import { ProfitabilityAnalysis } from '../../models/Profitability/ProfitabilityAnalysis';
import { ProfitabilityRequest } from '../../models/Profitability/ProfitabilityRequest';
import { ProfitabilityResponse } from '../../models/Profitability/ProfitabilityResponse';
import { ProfitabilityStats } from '../../models/Profitability/ProfitabilityStats';

@Injectable({
  providedIn: 'root'
})
export class ProfitabilityService {
  private readonly baseUrl = `${environment.apiUrl}/api/Profitability`;

  constructor(private http: HttpClient) { }

  //#region MÉTHODES PRINCIPALES

  /**
   * Obtenir l'analyse de rentabilité selon les critères
   */
  getProfitabilityAnalysis(request: ProfitabilityRequest): Observable<ProfitabilityResponse> {
    // Valider la requête
    const errors = request.validate();
    if (errors.length > 0) {
      return throwError(() => new Error(errors.join(', ')));
    }

    let params = new HttpParams()
      .set('startDate', request.startDate.toISOString())
      .set('endDate', request.endDate.toISOString());

    if (request.centreId) {
      params = params.set('centreId', request.centreId);
    }

    return this.http.get<ApiResponseData<ProfitabilityResponse>>(`${this.baseUrl}`, { params })
      .pipe(
        map(response => {
          if (response && response.data) {
            return new ProfitabilityResponse(response.data);
          }
          throw new Error('Réponse invalide du serveur');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obtenir l'analyse de rentabilité mensuelle en cours
   */
  getCurrentMonthProfitability(centreId?: string): Observable<ProfitabilityResponse> {
    let params = new HttpParams();

    if (centreId) {
      params = params.set('centreId', centreId);
    }

    return this.http.get<ApiResponseData<ProfitabilityResponse>>(`${this.baseUrl}/current-month`, { params })
      .pipe(
        map(response => {
          if (response && response.data) {
            return new ProfitabilityResponse(response.data);
          }
          throw new Error('Réponse invalide du serveur');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obtenir l'analyse de rentabilité pour un centre spécifique
   */
  getProfitabilityByCentre(centreId: string, startDate: Date, endDate: Date): Observable<ProfitabilityResponse> {
    if (!centreId) {
      return throwError(() => new Error('L\'identifiant du centre est requis'));
    }

    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());

    return this.http.get<ApiResponseData<ProfitabilityResponse>>(`${this.baseUrl}/by-centre/${centreId}`, { params })
      .pipe(
        map(response => {
          if (response && response.data) {
            return new ProfitabilityResponse(response.data);
          }
          throw new Error('Réponse invalide du serveur');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obtenir les statistiques globales uniquement
   */
  getGlobalStats(startDate: Date, endDate: Date): Observable<ProfitabilityStats> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());

    return this.http.get<ApiResponseData<ProfitabilityStats>>(`${this.baseUrl}/stats/global`, { params })
      .pipe(
        map(response => {
          if (response && response.data) {
            return new ProfitabilityStats(response.data);
          }
          throw new Error('Réponse invalide du serveur');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Comparer la rentabilité entre plusieurs périodes
   */
  compareMonths(centreId?: string): Observable<any> {
    let params = new HttpParams();

    if (centreId) {
      params = params.set('centreId', centreId);
    }

    return this.http.get<ApiResponseData<any>>(`${this.baseUrl}/compare/months`, { params })
      .pipe(
        map(response => {
          if (response && response.data) {
            return response.data;
          }
          throw new Error('Réponse invalide du serveur');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Exporter l'analyse de rentabilité en Excel
   */
  exportToExcel(request: ProfitabilityRequest): Observable<Blob> {
    // Valider la requête
    const errors = request.validate();
    if (errors.length > 0) {
      return throwError(() => new Error(errors.join(', ')));
    }

    let params = new HttpParams()
      .set('startDate', request.startDate.toISOString())
      .set('endDate', request.endDate.toISOString());

    if (request.centreId) {
      params = params.set('centreId', request.centreId);
    }

    return this.http.get(`${this.baseUrl}/export/excel`, {
      params,
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Sauvegarder un snapshot de l'analyse de rentabilité
   */
  saveProfitabilitySnapshot(centreId: string, startDate: Date, endDate: Date): Observable<ProfitabilityAnalysis> {
    if (!centreId) {
      return throwError(() => new Error('L\'identifiant du centre est requis'));
    }

    const params = new HttpParams()
      .set('centreId', centreId)
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());

    return this.http.post<ApiResponseData<ProfitabilityAnalysis>>(`${this.baseUrl}/snapshot`, null, { params })
      .pipe(
        map(response => {
          if (response && response.data) {
            return new ProfitabilityAnalysis(response.data);
          }
          throw new Error('Réponse invalide du serveur');
        }),
        catchError(this.handleError)
      );
  }

  //#endregion

  //#region MÉTHODES UTILITAIRES

  /**
   * Télécharger le fichier Excel
   */
  downloadExcel(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Créer une requête pour le mois en cours
   */
  createCurrentMonthRequest(centreId?: string): ProfitabilityRequest {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return new ProfitabilityRequest({
      centreId,
      startDate,
      endDate
    });
  }

  /**
   * Créer une requête pour le mois précédent
   */
  createPreviousMonthRequest(centreId?: string): ProfitabilityRequest {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startDate = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
    const endDate = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0);

    return new ProfitabilityRequest({
      centreId,
      startDate,
      endDate
    });
  }

  /**
   * Créer une requête pour une période personnalisée
   */
  createCustomPeriodRequest(startDate: Date, endDate: Date, centreId?: string): ProfitabilityRequest {
    return new ProfitabilityRequest({
      centreId,
      startDate,
      endDate
    });
  }

  /**
   * Formater une date pour le nom de fichier
   */
  private formatDateForFilename(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  //#endregion

  //#region GESTION DES ERREURS

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.status === 0) {
        errorMessage = 'Impossible de contacter le serveur';
      } else {
        errorMessage = `Erreur ${error.status}: ${error.message}`;
      }
    }

    console.error('Erreur dans ProfitabilityService:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  //#endregion
}

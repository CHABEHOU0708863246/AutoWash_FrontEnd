import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError, map, catchError, tap } from 'rxjs';
import { AttendanceRecord } from '../../models/Attendances/AttendanceRecord';
import { AttendanceUpdateRequest } from '../../models/Attendances/AttendanceUpdateRequest';
import { DailyAttendanceRequest } from '../../models/Attendances/DailyAttendanceRequest';
import { MonthlyAttendanceSummary } from '../../models/Attendances/MonthlyAttendanceSummary';
import { WasherForAttendance } from '../../models/Attendances/WasherForAttendance';
import { ApiResponseData } from '../../models/ApiResponseData';

@Injectable({
  providedIn: 'root'
})
export class AttendancesService {

  private readonly apiUrl = 'https://localhost:7139/api/Attendance';

  constructor(private http: HttpClient) { }

  // MARK: - Méthodes pour le Gérant

  /**
   * Marquer les présences quotidiennes
   */
  markAttendance(request: DailyAttendanceRequest): Observable<ApiResponseData<AttendanceRecord>> {
    return this.http.post<ApiResponseData<AttendanceRecord>>(
      `${this.apiUrl}/daily`,
      request
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Mettre à jour une présence spécifique
   */
  updateAttendance(recordId: string, request: AttendanceUpdateRequest): Observable<ApiResponseData<AttendanceRecord>> {
    return this.http.put<ApiResponseData<AttendanceRecord>>(
      `${this.apiUrl}/${recordId}`,
      request
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Valider une présence
   */
  validateAttendance(recordId: string, validatedBy: string): Observable<ApiResponseData<boolean>> {
    const params = new HttpParams().set('validatedBy', validatedBy);

    return this.http.put<ApiResponseData<boolean>>(
      `${this.apiUrl}/${recordId}/validate`,
      {},
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // MARK: - Méthodes pour l'Administrateur

  /**
   * Récupérer les présences quotidiennes d'un centre
   */
  getDailyAttendance(centreId: string, date: Date): Observable<ApiResponseData<AttendanceRecord[]>> {
    const params = new HttpParams()
      .set('centreId', centreId)
      .set('date', date.toISOString().split('T')[0]); // Format YYYY-MM-DD

    return this.http.get<ApiResponseData<AttendanceRecord[]>>(
      `${this.apiUrl}/daily`,
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer le résumé mensuel d'un centre
   */
  getMonthlySummary(centreId: string, year: number, month: number): Observable<ApiResponseData<MonthlyAttendanceSummary[]>> {
    const params = new HttpParams()
      .set('centreId', centreId)
      .set('year', year.toString())
      .set('month', month.toString());

    return this.http.get<ApiResponseData<MonthlyAttendanceSummary[]>>(
      `${this.apiUrl}/monthly-summary`,
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Générer un rapport hebdomadaire
   */
generateWeeklyReport(centreId: string, startDate: Date): Observable<ApiResponseData<Blob>> {
  const params = new HttpParams()
    .set('centreId', centreId)
    .set('startDate', startDate.toISOString().split('T')[0]);

  return this.http.get<Blob>(
    `${this.apiUrl}/reports/weekly`,
    {
      params,
      responseType: 'blob' as 'json'
    }
  ).pipe(
    map(blob => {
      if (blob instanceof Blob && blob.size > 0) {
        return new ApiResponseData<Blob>(
          true,
          'Rapport généré avec succès',
          blob
        );
      } else {
        throw new Error('Réponse vide ou invalide du serveur');
      }
    }),
    catchError((error: HttpErrorResponse) => {
      // Gérer les erreurs blob
      if (error.error instanceof Blob) {
        return this.handleBlobError(error);
      }
      return this.handleError(error);
    })
  );
}

/**
 * Gère les erreurs blob en lisant le contenu
 */
private handleBlobError(error: HttpErrorResponse): Observable<never> {
  const reader = new FileReader();

  return new Observable(observer => {
    reader.onload = () => {
      try {
        const errorText = reader.result as string;
        const errorObj = JSON.parse(errorText);
        observer.error(new Error(errorObj.message || 'Erreur serveur'));
      } catch {
        observer.error(new Error('Erreur lors du traitement de la réponse'));
      }
    };

    reader.onerror = () => {
      observer.error(new Error('Impossible de lire la réponse d\'erreur'));
    };

    reader.readAsText(error.error);
  });
}

  /**
   * Générer un rapport mensuel
   */
  generateMonthlyReport(centreId: string, year: number, month: number): Observable<ApiResponseData<Blob>> {
    const params = new HttpParams()
      .set('centreId', centreId)
      .set('year', year.toString())
      .set('month', month.toString());

    return this.http.get(
      `${this.apiUrl}/reports/monthly`,
      {
        params,
        responseType: 'blob',
        observe: 'response'
      }
    ).pipe(
      map(response => {
        const blob = response.body as Blob;
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = this.extractFilenameFromContentDisposition(contentDisposition) || `rapport-mensuel-${year}-${month}.xlsx`;

        return new ApiResponseData<Blob>(
          true,
          'Rapport généré avec succès',
          new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        );
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Générer un rapport annuel
   */
  generateAnnualReport(centreId: string, year: number): Observable<ApiResponseData<Blob>> {
    const params = new HttpParams()
      .set('centreId', centreId)
      .set('year', year.toString());

    return this.http.get(
      `${this.apiUrl}/reports/annual`,
      {
        params,
        responseType: 'blob',
        observe: 'response'
      }
    ).pipe(
      map(response => {
        const blob = response.body as Blob;
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = this.extractFilenameFromContentDisposition(contentDisposition) || `rapport-annuel-${year}.xlsx`;

        return new ApiResponseData<Blob>(
          true,
          'Rapport généré avec succès',
          new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        );
      }),
      catchError(this.handleError)
    );
  }

  // MARK: - Méthodes pour le Laveur

  /**
   * Récupérer la présence du jour pour un utilisateur
   */
  getMyAttendanceForToday(userId: string): Observable<ApiResponseData<AttendanceRecord>> {
    const params = new HttpParams().set('userId', userId);

    return this.http.get<ApiResponseData<AttendanceRecord>>(
      `${this.apiUrl}/my-attendance/today`,
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer l'historique des présences d'un utilisateur
   */
  getMyAttendanceHistory(userId: string, startDate: Date, endDate: Date): Observable<ApiResponseData<AttendanceRecord[]>> {
    const params = new HttpParams()
      .set('userId', userId)
      .set('startDate', startDate.toISOString().split('T')[0])
      .set('endDate', endDate.toISOString().split('T')[0]);

    return this.http.get<ApiResponseData<AttendanceRecord[]>>(
      `${this.apiUrl}/my-attendance/history`,
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // MARK: - Méthodes Utilitaires

  /**
   * Récupérer les données du formulaire de présence
   */
  getAttendanceFormData(centreId: string, date: Date): Observable<ApiResponseData<any[]>> {
    const params = new HttpParams()
      .set('centreId', centreId)
      .set('date', date.toISOString().split('T')[0]);

    return this.http.get<ApiResponseData<any[]>>(
      `${this.apiUrl}/form-data`,
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Générer les résumés mensuels
   */
  generateMonthlySummaries(year: number, month: number): Observable<ApiResponseData<boolean>> {
    const params = new HttpParams()
      .set('year', year.toString())
      .set('month', month.toString());

    return this.http.post<ApiResponseData<boolean>>(
      `${this.apiUrl}/generate-summaries`,
      {},
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // MARK: - Méthodes Privées

  /**
   * Gestion centralisée des erreurs
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Une erreur est survenue lors de l\'opération';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur client: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      const serverError = error.error?.message || error.error || 'Erreur serveur inconnue';

      switch (error.status) {
        case 400:
          errorMessage = `Requête invalide: ${serverError}`;
          break;
        case 404:
          errorMessage = `Ressource non trouvée: ${serverError}`;
          break;
        case 500:
          errorMessage = `Erreur interne du serveur: ${serverError}`;
          break;
        default:
          errorMessage = `Erreur serveur (HTTP ${error.status}): ${serverError}`;
          break;
      }
    }

    console.error('Erreur dans AttendanceService:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Extraire le nom du fichier depuis le header Content-Disposition
   */
  private extractFilenameFromContentDisposition(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;

    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(contentDisposition);

    if (matches != null && matches[1]) {
      return matches[1].replace(/['"]/g, '');
    }

    return null;
  }

  /**
   * Télécharger un fichier blob
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // MARK: - Méthodes Helper pour la Conversion de Dates

  /**
   * Convertir une chaîne TimeSpan en minutes
   */
  timeSpanToMinutes(timeSpan: string): number {
    if (!timeSpan) return 0;

    const parts = timeSpan.split(':');
    if (parts.length !== 2) return 0;

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    return (hours * 60) + minutes;
  }

  /**
   * Convertir des minutes en chaîne TimeSpan
   */
  minutesToTimeSpan(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Formater une date pour l'API (YYYY-MM-DD)
   */
  formatDateForApi(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Formater une date et heure pour l'API
   */
  formatDateTimeForApi(date: Date): string {
    return date.toISOString();
  }
}

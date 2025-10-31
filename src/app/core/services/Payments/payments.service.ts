import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError, tap, of, map } from 'rxjs';
import { Payment } from '../../models/Payments/Payment';
import { WasherPaymentSummary } from '../../models/Payments/WasherPaymentSummary';
import { ManagerPaymentSummary } from '../../models/Payments/ManagerPaymentSummary';
import { PaymentReport } from '../../models/Payments/PaymentReport';
import { AuditSummary } from '../../models/Payments/AuditSummary';
import { MonthlyPaymentFilter } from '../../models/Payments/MonthlyPaymentFilter';
import { PaymentMethod } from '../../models/Payments/PaymentMethod';
import { ApiResponseData } from '../../models/ApiResponseData';
import { PaymentType } from '../../models/Payments/PaymentType';


export interface ReceiptBase64 {
  imageBase64: string;
  mimeType: string;
  fileName: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentsService {
  createManagerPayment(paymentData: { managerId: string; centreId: string; paymentType: PaymentType; method: PaymentMethod; amount: number; baseAmount: number; bonus: number; deductions: number; paymentDate: Date; period: string; notes: string; approvedBy: string | undefined; }) {
    throw new Error('Method not implemented.');
  }

  private baseUrl = 'https://localhost:7139/api/Payments';

  constructor(private http: HttpClient) { }

  // ============================
  // 🔹 Génération des paiements
  // ============================

  /**
   * Générer les paiements mensuels pour tous les laveurs d'un centre
   */
  generateMonthlyPayments(centreId: string, month: number, year: number, approvedBy: string): Observable<ApiResponseData<Payment[]>> {
    const params = new HttpParams()
      .set('centreId', centreId)
      .set('month', month.toString())
      .set('year', year.toString())
      .set('approvedBy', approvedBy);

    return this.http.post<ApiResponseData<Payment[]>>(`${this.baseUrl}/generate/monthly`, null, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Générer le paiement mensuel pour un laveur spécifique
   */
  generateWasherMonthlyPayment(washerId: string, centreId: string, month: number, year: number, approvedBy: string): Observable<ApiResponseData<Payment>> {
    const params = new HttpParams()
      .set('washerId', washerId)
      .set('centreId', centreId)
      .set('month', month.toString())
      .set('year', year.toString())
      .set('approvedBy', approvedBy);

    return this.http.post<ApiResponseData<Payment>>(`${this.baseUrl}/generate/washer`, null, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Générer les paiements mensuels pour une sélection de laveurs
   */
  generateSelectedWashersPayments(washerIds: string[], centreId: string, month: number, year: number, approvedBy: string): Observable<ApiResponseData<Payment[]>> {
    const params = new HttpParams()
      .set('centreId', centreId)
      .set('month', month.toString())
      .set('year', year.toString())
      .set('approvedBy', approvedBy);

    return this.http.post<ApiResponseData<Payment[]>>(`${this.baseUrl}/generate/selected`, washerIds, { params })
      .pipe(catchError(this.handleError));
  }

  // ============================
  // 🔹 Validation & gestion
  // ============================

  /**
   * Valider un paiement mensuel
   */
  validateMonthlyPayment(paymentId: string, approvedBy: string, notes?: string): Observable<ApiResponseData<Payment>> {
    let params = new HttpParams()
      .set('approvedBy', approvedBy);

    if (notes) {
      params = params.set('notes', notes);
    }

    return this.http.put<ApiResponseData<Payment>>(`${this.baseUrl}/validate/${paymentId}`, null, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Valider plusieurs paiements mensuels
   */
  validateMultiplePayments(paymentIds: string[], approvedBy: string, notes?: string): Observable<ApiResponseData<Payment[]>> {
    let params = new HttpParams()
      .set('approvedBy', approvedBy);

    if (notes) {
      params = params.set('notes', notes);
    }

    return this.http.put<ApiResponseData<Payment[]>>(`${this.baseUrl}/validate/multiple`, paymentIds, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Annuler un paiement mensuel
   */
  cancelMonthlyPayment(paymentId: string, cancelledBy: string, reason: string): Observable<ApiResponseData<Payment>> {
    const params = new HttpParams()
      .set('cancelledBy', cancelledBy)
      .set('reason', reason);

    return this.http.put<ApiResponseData<Payment>>(`${this.baseUrl}/cancel/${paymentId}`, null, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Modifier la méthode de paiement
   */
  updatePaymentMethod(paymentId: string, method: PaymentMethod, updatedBy: string): Observable<ApiResponseData<Payment>> {
    const params = new HttpParams()
      .set('method', method.toString())
      .set('updatedBy', updatedBy);

    return this.http.put<ApiResponseData<Payment>>(`${this.baseUrl}/update-method/${paymentId}`, null, { params })
      .pipe(catchError(this.handleError));
  }

  // ============================
  // 🔹 Consultation
  // ============================

  /**
   * Récupérer les paiements mensuels d'un laveur
   */
  getWasherMonthlyPayments(washerId: string, month?: number, year?: number): Observable<ApiResponseData<Payment[]>> {
    let params = new HttpParams();

    if (month !== undefined && month !== null) {
      params = params.set('month', month.toString());
    }

    if (year !== undefined && year !== null) {
      params = params.set('year', year.toString());
    }

    return this.http.get<ApiResponseData<Payment[]>>(`${this.baseUrl}/washer/${washerId}/monthly`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupérer les paiements mensuels d'un centre
   */
  getCentreMonthlyPayments(centreId: string, month: number, year: number): Observable<ApiResponseData<Payment[]>> {
    return this.http.get<ApiResponseData<Payment[]>>(`${this.baseUrl}/centre/${centreId}/monthly?month=${month}&year=${year}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupérer les paiements avec filtres avancés
   */
getPaymentsWithFilter(filter: MonthlyPaymentFilter): Observable<ApiResponseData<Payment[]>> {
  return this.http.post<ApiResponseData<Payment[]>>(`${this.baseUrl}/filter`, filter)
    .pipe(
      tap(response => console.log('Réponse brute:', response)),
      map(response => {
        // S'assurer que les données sont bien mappées vers des objets Payment
        if (response.success && response.data) {
          return {
            ...response,
            data: response.data.map(payment => new Payment(payment))
          };
        }
        return response;
      }),
      catchError(this.handleError)
    );
}

  /**
   * Récupérer un paiement par son ID
   */
  getPaymentById(paymentId: string): Observable<ApiResponseData<Payment>> {
    return this.http.get<ApiResponseData<Payment>>(`${this.baseUrl}/${paymentId}`)
      .pipe(catchError(this.handleError));
  }

  // ============================
  // 🔹 Calculs & Résumés
  // ============================

  /**
   * Calculer le paiement d'un laveur
   */
  calculateWasherPayment(washerId: string, month: number, year: number, centreId: string): Observable<ApiResponseData<WasherPaymentSummary>> {
    const params = new HttpParams()
      .set('washerId', washerId)
      .set('month', month.toString())
      .set('year', year.toString())
      .set('centreId', centreId);

    return this.http.get<ApiResponseData<WasherPaymentSummary>>(`${this.baseUrl}/calculate/washer`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupérer les résumés des paiements des laveurs d'un centre
   */
  getWashersPaymentSummaries(centreId: string, month: number, year: number): Observable<ApiResponseData<WasherPaymentSummary[]>> {
    return this.http.get<ApiResponseData<WasherPaymentSummary[]>>(`${this.baseUrl}/summaries/${centreId}?month=${month}&year=${year}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupérer les statistiques de paiement d'un centre
   */
  getCentrePaymentStatistics(centreId: string, month: number, year: number): Observable<ApiResponseData<AuditSummary>> {
    return this.http.get<ApiResponseData<AuditSummary>>(`${this.baseUrl}/stats/${centreId}?month=${month}&year=${year}`)
      .pipe(catchError(this.handleError));
  }

  // ============================
  // 🔹 Historique & Rapports
  // ============================

  /**
   * Récupérer l'historique des paiements d'un laveur
   */
  getWasherPaymentHistory(washerId: string, startDate?: Date, endDate?: Date): Observable<ApiResponseData<Payment[]>> {
    let params = new HttpParams();

    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }

    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get<ApiResponseData<Payment[]>>(`${this.baseUrl}/washer/${washerId}/history`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Générer un rapport de paiement pour un centre
   */
  generatePaymentReport(centreId: string, month: number, year: number): Observable<ApiResponseData<PaymentReport>> {
    return this.http.get<ApiResponseData<PaymentReport>>(`${this.baseUrl}/report/${centreId}?month=${month}&year=${year}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Exporter les paiements vers Excel
   */
  exportPaymentsToExcel(centreId: string, month: number, year: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export/${centreId}?month=${month}&year=${year}`, {
      responseType: 'blob'
    }).pipe(catchError(this.handleError));
  }

  // ============================
  // 🔹 Reçus
  // ============================

/**
   * Télécharger le reçu de paiement en image PNG
   */
  generatePaymentReceipt(paymentId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/receipt/${paymentId}`, {
      responseType: 'blob' // Important: pour recevoir l'image
    }).pipe(catchError(this.handleError));
  }

  /**
   * Obtenir le reçu en base64 (pour affichage direct dans l'app)
   */
  generatePaymentReceiptBase64(paymentId: string): Observable<ApiResponseData<ReceiptBase64>> {
    return this.http.get<ApiResponseData<ReceiptBase64>>(`${this.baseUrl}/receipt/${paymentId}/base64`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Envoyer un reçu par email
   */
  sendPaymentReceiptByEmail(paymentId: string, email: string): Observable<ApiResponseData<boolean>> {
    const params = new HttpParams()
      .set('paymentId', paymentId)
      .set('email', email);

    return this.http.post<ApiResponseData<boolean>>(`${this.baseUrl}/receipt/send`, null, { params })
      .pipe(catchError(this.handleError));
  }

  // ============================
  // 🔹 Vérifications
  // ============================

  /**
   * Vérifier si des paiements mensuels existent pour un centre
   */
  checkMonthlyPaymentsExist(centreId: string, month: number, year: number): Observable<ApiResponseData<boolean>> {
    const params = new HttpParams()
      .set('centreId', centreId)
      .set('month', month.toString())
      .set('year', year.toString());

    return this.http.get<ApiResponseData<boolean>>(`${this.baseUrl}/exists`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupérer le statut de paiement d'un laveur
   */
  getWasherPaymentStatus(washerId: string, month: number, year: number): Observable<ApiResponseData<string>> {
    const params = new HttpParams()
      .set('washerId', washerId)
      .set('month', month.toString())
      .set('year', year.toString());

    return this.http.get<ApiResponseData<string>>(`${this.baseUrl}/status`, { params })
      .pipe(catchError(this.handleError));
  }

  // ============================
  // 🔹 Gestion des Paiements Managers
  // ============================

  /**
   * Générer le paiement mensuel d'un manager
   */
  generateManagerMonthlyPayment(managerId: string, centreId: string, month: number, year: number, approvedBy: string): Observable<ApiResponseData<Payment>> {
    const params = new HttpParams()
      .set('managerId', managerId)
      .set('centreId', centreId)
      .set('month', month.toString())
      .set('year', year.toString())
      .set('approvedBy', approvedBy);

    return this.http.post<ApiResponseData<Payment>>(`${this.baseUrl}/generate/manager`, null, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Générer les paiements mensuels pour tous les managers d'un centre
   */
  generateAllManagersPayments(centreId: string, month: number, year: number, approvedBy: string): Observable<ApiResponseData<Payment[]>> {
    const params = new HttpParams()
      .set('centreId', centreId)
      .set('month', month.toString())
      .set('year', year.toString())
      .set('approvedBy', approvedBy);

    return this.http.post<ApiResponseData<Payment[]>>(`${this.baseUrl}/generate/managers/all`, null, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Calculer le paiement d'un manager
   */
  calculateManagerPayment(managerId: string, month: number, year: number, centreId: string): Observable<ApiResponseData<ManagerPaymentSummary>> {
    const params = new HttpParams()
      .set('managerId', managerId)
      .set('month', month.toString())
      .set('year', year.toString())
      .set('centreId', centreId);

    return this.http.get<ApiResponseData<ManagerPaymentSummary>>(`${this.baseUrl}/calculate/manager`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupérer les résumés des paiements des managers d'un centre
   */
  getManagersPaymentSummaries(centreId: string, month: number, year: number): Observable<ApiResponseData<ManagerPaymentSummary[]>> {
    return this.http.get<ApiResponseData<ManagerPaymentSummary[]>>(`${this.baseUrl}/summaries/managers/${centreId}?month=${month}&year=${year}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupérer les paiements mensuels d'un manager
   */
  getManagerMonthlyPayments(managerId: string, month?: number, year?: number): Observable<ApiResponseData<Payment[]>> {
    let params = new HttpParams();

    if (month !== undefined && month !== null) {
      params = params.set('month', month.toString());
    }

    if (year !== undefined && year !== null) {
      params = params.set('year', year.toString());
    }

    return this.http.get<ApiResponseData<Payment[]>>(`${this.baseUrl}/manager/${managerId}/monthly`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupérer l'historique des paiements d'un manager
   */
  getManagerPaymentHistory(managerId: string, startDate?: Date, endDate?: Date): Observable<ApiResponseData<Payment[]>> {
    let params = new HttpParams();

    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }

    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get<ApiResponseData<Payment[]>>(`${this.baseUrl}/manager/${managerId}/history`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupérer le statut de paiement d'un manager
   */
  getManagerPaymentStatus(managerId: string, month: number, year: number): Observable<ApiResponseData<string>> {
    const params = new HttpParams()
      .set('managerId', managerId)
      .set('month', month.toString())
      .set('year', year.toString());

    return this.http.get<ApiResponseData<string>>(`${this.baseUrl}/manager/status`, { params })
      .pipe(catchError(this.handleError));
  }

  // ============================
  // 🔹 Méthodes utilitaires
  // ============================

  /**
   * Gestion centralisée des erreurs HTTP
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      errorMessage = `Code d'erreur: ${error.status}\nMessage: ${error.message}`;

      // Messages d'erreur spécifiques selon le code HTTP
      switch (error.status) {
        case 400:
          errorMessage = 'Requête invalide. Vérifiez les données saisies.';
          break;
        case 401:
          errorMessage = 'Non autorisé. Veuillez vous reconnecter.';
          break;
        case 403:
          errorMessage = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée.';
          break;
        case 500:
          errorMessage = 'Erreur interne du serveur. Veuillez réessayer plus tard.';
          break;
      }
    }

    console.error('Erreur PaymentsService:', error);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Télécharger un fichier blob (pour l'export Excel)
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Formater un montant pour l'affichage
   */
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  }

  /**
   * Obtenir le nom du mois
   */
  getMonthName(month: number): string {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[month - 1] || 'Mois inconnu';
  }

  /**
   * Vérifier si une période est valide
   */
  isValidPeriod(month: number, year: number): boolean {
    const currentYear = new Date().getFullYear();
    return month >= 1 && month <= 12 && year >= 2020 && year <= currentYear + 1;
  }

  /**
   * Générer une période d'affichage (ex: "Janvier 2024")
   */
  getDisplayPeriod(month: number, year: number): string {
    return `${this.getMonthName(month)} ${year}`;
  }
}

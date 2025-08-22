import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiResponseData } from '../../models/ApiResponseData';
import { Expense } from '../../models/Expenses/Expense';
import { ExpenseRequest } from '../../models/Expenses/ExpenseRequest';
import { PaginatedResponse } from '../../models/Paginate/PaginatedResponse';


@Injectable({
  providedIn: 'root'
})
export class ExpensesService {
  private readonly baseUrl = `${environment.apiUrl}/api/Expenses`;

  constructor(private http: HttpClient) { }

  //#region OPÉRATIONS CRUD DE BASE

  /**
   * Créer une nouvelle dépense
   */
  createExpense(request: ExpenseRequest): Observable<ApiResponseData<Expense>> {
    return this.http.post<ApiResponseData<Expense>>(this.baseUrl, request);
  }

  /**
   * Obtenir une dépense par ID
   */
  getExpenseById(id: string): Observable<ApiResponseData<Expense>> {
    return this.http.get<ApiResponseData<Expense>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Mettre à jour une dépense existante
   */
  updateExpense(id: string, request: ExpenseRequest): Observable<ApiResponseData<Expense>> {
    return this.http.put<ApiResponseData<Expense>>(`${this.baseUrl}/${id}`, request);
  }

  /**
   * Supprimer une dépense
   */
  deleteExpense(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  //#endregion

  //#region RÉCUPÉRATION ET FILTRAGE

  /**
   * Obtenir toutes les dépenses d'un centre avec pagination
   */
  getExpensesByCentre(
    centreId: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<ApiResponseData<PaginatedResponse<Expense>>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponseData<PaginatedResponse<Expense>>>(
      `${this.baseUrl}/centre/${centreId}`,
      { params }
    );
  }

  /**
   * Obtenir les dépenses par type avec pagination
   */
  getExpensesByType(
    centreId: string,
    type: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<ApiResponseData<PaginatedResponse<Expense>>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponseData<PaginatedResponse<Expense>>>(
      `${this.baseUrl}/centre/${centreId}/types`,
      { params }
    );
  }

  /**
   * Obtenir les dépenses par période avec pagination
   */
  getExpensesByDateRange(
    centreId: string,
    startDate: Date,
    endDate: Date,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<ApiResponseData<PaginatedResponse<Expense>>> {
    let params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString())
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponseData<PaginatedResponse<Expense>>>(
      `${this.baseUrl}/centre/${centreId}/daterange`,
      { params }
    );
  }

  /**
   * Rechercher des dépenses par description
   */
  searchExpensesByDescription(
    centreId: string,
    searchTerm: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<ApiResponseData<PaginatedResponse<Expense>>> {
    let params = new HttpParams()
      .set('searchTerm', searchTerm)
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponseData<PaginatedResponse<Expense>>>(
      `${this.baseUrl}/centre/${centreId}/search`,
      { params }
    );
  }

  //#endregion

  //#region GESTION DES TYPES DE DÉPENSES

  /**
   * Obtenir tous les types de dépenses disponibles pour un centre
   */
  getExpenseTypes(centreId: string): Observable<ApiResponseData<string[]>> {
    return this.http.get<ApiResponseData<string[]>>(
      `${this.baseUrl}/centre/${centreId}/types`
    );
  }

  /**
   * Ajouter un nouveau type de dépense personnalisé
   */
  addCustomExpenseType(centreId: string, expenseType: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/centre/${centreId}/types`,
      expenseType,
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Supprimer un type de dépense personnalisé
   */
  removeCustomExpenseType(centreId: string, expenseType: string): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/centre/${centreId}/types/${encodeURIComponent(expenseType)}`
    );
  }

  //#endregion
}

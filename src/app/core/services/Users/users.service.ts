import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError, tap, of } from 'rxjs';
import { Users } from '../../models/Users/Users';
import { UpdateProfileRequest } from '../../models/Users/UpdateProfileRequest';
import { UserEditableFields } from '../../models/Users/UserEditableFields';
import { AuthService } from '../Auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  getManagersByCentre(centreId: string) {
    throw new Error('Method not implemented.');
  }
  createUser(userData: any) {
    throw new Error('Method not implemented.');
  }

  private baseUrl = 'https://localhost:7139/api/User';

  constructor(private http: HttpClient, private authService: AuthService) { }

  /**
   * 1.1 Enregistrement d'un nouvel utilisateur avec photo.
   * @param formData - Les données du formulaire contenant les informations de l'utilisateur et la photo.
   * @returns Un Observable contenant l'utilisateur enregistré.
   */
registerUserWithPhoto(userData: Users, photoFile?: File): Observable<any> {
  const formData = new FormData();

  // Ajouter toutes les propriétés de l'utilisateur
  Object.keys(userData).forEach(key => {
    const value = userData[key as keyof Users];

    // Ignorer photoFile dans cette boucle
    if (key === 'photoFile') return;

    if (Array.isArray(value)) {
      if (key === 'roles') {
        value.forEach(role => formData.append('Roles', role));
      }
    } else if (value instanceof Date) {
      formData.append(key, value.toISOString());
    } else if (value !== undefined && value !== null) {
      formData.append(key, value.toString());
    }
  });

  // Ajouter explicitement le password
  if (userData.password) {
    formData.append('Password', userData.password);
  }

  // Ajouter le fichier photo
  if (photoFile) {
    formData.append('PhotoFile', photoFile, photoFile.name);
  }

  return this.http.post(`${this.baseUrl}`, formData).pipe(
    catchError(this.handleError)
  );
}

  /**
   * 1. Enregistrement d'un nouvel utilisateur.
   * @param userRequest - Les informations de l'utilisateur à enregistrer.
   * @returns Un Observable contenant l'utilisateur enregistré.
   */
  registerUser(userRequest: Users): Observable<Users> {
    return this.http.post<Users>(`${this.baseUrl}`, userRequest).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 2. Obtention de tous les utilisateurs.
   * @returns Un Observable contenant une liste d'utilisateurs.
   */
  getAllUsers(): Observable<Users[]> {
    return this.http.get<Users[]>(`${this.baseUrl}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 2.1 Obtention de la photo d'un utilisateur.
   * @param photoId - L'ID de la photo ou un objet File.
   * @returns Un Observable contenant la photo sous forme de Blob.
   */
  getUserPhoto(photoUrl: string): Observable<Blob> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });

    return this.http.get(`${this.baseUrl}/photo/${photoUrl}`, {
      headers,
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 3. Obtention d'un utilisateur par son ID.
   * @param id - L'ID de l'utilisateur.
   * @returns Un Observable contenant l'utilisateur ou null si non trouvé.
   */
  getUserById(id: string): Observable<Users | null> {
    return this.http.get<Users | null>(`${this.baseUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 3.1 Obtention de l'utilisateur actuellement connecté.
   * @returns Un Observable contenant l'utilisateur connecté.
   */
  getCurrentUser(): Observable<Users> {
    return this.http.get<Users>(`${this.baseUrl}/current`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 4. Activation/désactivation du compte utilisateur.
   * @param id - L'ID de l'utilisateur dont le compte doit être activé ou désactivé.
   * @returns Un Observable pour la mise à jour du compte.
   */
  toggleUserAccount(id: string): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 5. Exportation des utilisateurs.
   * @param fileType - Le type de fichier pour l'exportation (par exemple, 'CSV', 'PDF').
   * @returns Un Observable contenant le fichier exporté en format Blob.
   */
  exportUsers(fileType: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export-users?fileType=${fileType}`, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 6. Récupération des utilisateurs paginés.
   * @param pageNumber - Le numéro de la page (par défaut 1).
   * @param pageSize - Le nombre d'éléments par page (par défaut 10).
   * @returns Un Observable contenant les utilisateurs paginés.
   */
  getPaginatedUsers(pageNumber: number = 1, pageSize: number = 10): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/paginated?pageNumber=${pageNumber}&pageSize=${pageSize}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 7. Mise à jour du rôle d'un utilisateur.
   * @param userId - L'ID de l'utilisateur.
   * @param newRole - Le nouveau rôle à assigner à l'utilisateur.
   * @returns Un Observable contenant le résultat de la mise à jour.
   */
  updateUserRole(userId: string, newRole: string): Observable<any> {
    // Vérifiez que userId et newRole sont bien des chaînes valides avant de les envoyer
    if (!userId || !newRole) {
      return throwError(() => new Error('userId et newRole sont nécessaires.'));
    }

    const url = `${this.baseUrl}/update-user-role?userId=${userId}&newRole=${newRole}`;

    return this.http.put<any>(url, {}).pipe(
      tap(() => {

      }),
      catchError(this.handleError)
    );
  }

  /**
   * Crée les headers avec le token d'authentification
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('Token d\'authentification manquant');
    }

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Crée les headers pour FormData (sans Content-Type car il sera défini automatiquement)
   */
  private getAuthHeadersForFormData(): HttpHeaders {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('Token d\'authentification manquant');
    }

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * 8. Obtenir les informations du profil et les champs modifiables.
   * @returns Un Observable contenant les champs modifiables de l'utilisateur connecté.
   */
  getProfile(): Observable<UserEditableFields> {
    const headers = this.getAuthHeaders();
    return this.http.get<UserEditableFields>(`${this.baseUrl}/profile`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 9. Mettre à jour le profil de l'utilisateur connecté.
   * @param request - Les données de mise à jour du profil.
   * @returns Un Observable contenant le résultat de la mise à jour.
   */
  updateProfile(request: UpdateProfileRequest): Observable<any> {
    const headers = this.getAuthHeadersForFormData();
    const formData = new FormData();

    // Ajouter les champs de texte s'ils sont définis
    if (request.firstName) formData.append('FirstName', request.firstName);
    if (request.lastName) formData.append('LastName', request.lastName);
    if (request.phoneNumber) formData.append('PhoneNumber', request.phoneNumber);
    if (request.gender) formData.append('Gender', request.gender);
    if (request.contractType) formData.append('ContractType', request.contractType);
    if (request.numberOfChildren !== undefined && request.numberOfChildren !== null) {
      formData.append('NumberOfChildren', request.numberOfChildren.toString());
    }
    if (request.maritalStatus) formData.append('MaritalStatus', request.maritalStatus);
    if (request.residence) formData.append('Residence', request.residence);
    if (request.postalAddress) formData.append('PostalAddress', request.postalAddress);
    if (request.centreId) formData.append('CentreId', request.centreId);

    // Ajouter les champs pour le changement de mot de passe
    if (request.currentPassword) formData.append('CurrentPassword', request.currentPassword);
    if (request.newPassword) formData.append('NewPassword', request.newPassword);
    if (request.confirmNewPassword) formData.append('ConfirmNewPassword', request.confirmNewPassword);

    // Ajouter le fichier photo s'il existe
    if (request.photoFile) {
      formData.append('PhotoFile', request.photoFile, request.photoFile.name);
    }

    return this.http.put<any>(`${this.baseUrl}/profile`, formData, { headers }).pipe(
      catchError(this.handleError)
    );
  }



  /**
   * Gestion centralisée des erreurs HTTP.
   * @param error - L'erreur HTTP reçue.
   * @returns Un Observable d'erreur avec un message formaté.
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      errorMessage = `Code d'erreur: ${error.status}\nMessage: ${error.message}`;
    }

    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}

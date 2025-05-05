import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TokenService } from '../services/Token/token.service';

/**
 * `AuthInterceptor` : Intercepteur HTTP pour ajouter un jeton d'authentification aux requêtes sortantes.
 *
 * Cet intercepteur vérifie si un jeton d'authentification est présent et, le cas échéant,
 * le joint aux en-têtes des requêtes HTTP via le champ `Authorization`.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  /**
   * Constructeur de l'intercepteur.
   *
   * @param tokenService - Service pour gérer les jetons d'authentification.
   */
  constructor(private tokenService: TokenService) {}

  /**
   * Intercepte une requête HTTP et la modifie pour inclure un jeton d'authentification si disponible.
   *
   * @param request - La requête HTTP entrante à intercepter.
   * @param next - Le gestionnaire suivant dans la chaîne des intercepteurs.
   * @returns Un flux observable de l'événement HTTP modifié.
   */
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Récupère le jeton d'authentification depuis le service
    const token = this.tokenService.getToken();

    // Si un jeton est disponible, clone la requête et ajoute l'en-tête Authorization
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    // Passe la requête (modifiée ou non) au prochain gestionnaire
    return next.handle(request);
  }
}

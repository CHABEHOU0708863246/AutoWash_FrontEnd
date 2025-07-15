/*****/
/**
 * Classe générique pour représenter une réponse API standardisée avec des données
 * @template T Type des données contenues dans la réponse
 */
export class ApiResponseData<T> {
  /*****/
  /**
   * Indique si la requête a réussi
   */
  success: boolean;

  /*****/
  /**
   * Message décrivant le résultat de l'opération
   */
  message: string;

  /*****/
  /**
   * Données retournées par l'API
   */
  data: T;

  /*****/
  /**
   * Crée une nouvelle instance de ApiResponseData
   * @param success Indique si la requête a réussi
   * @param message Message décrivant le résultat
   * @param data Données retournées par l'API
   */
  constructor(success: boolean, message: string, data: T) {
    this.success = success;
    this.message = message;
    this.data = data;
  }
}

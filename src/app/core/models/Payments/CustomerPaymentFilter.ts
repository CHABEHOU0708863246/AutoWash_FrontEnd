import { PaymentMethod } from "./PaymentMethod";
import { PaymentStatus } from "./PaymentStatus";


/**
 * Filtre pour la recherche des paiements
 */
export interface CustomerPaymentFilter {
  centreId?: string;
  startDate?: Date;
  endDate?: Date;
  method?: PaymentMethod;
  minAmount?: number;
  maxAmount?: number;
  customerPhone?: string;
  vehiclePlate?: string;
  status?: PaymentStatus;

  /**
   * @minimum 1
   */
  page: number;

  /**
   * @minimum 1
   * @maximum 100
   */
  pageSize: number;
}

/**
 * Implémentation par défaut de CustomerPaymentFilter
 */
export class CustomerPaymentFilter implements CustomerPaymentFilter {
  centreId?: string;
  startDate?: Date;
  endDate?: Date;
  method?: PaymentMethod;
  minAmount?: number;
  maxAmount?: number;
  customerPhone?: string;
  vehiclePlate?: string;
  status?: PaymentStatus;
  page: number = 1;
  pageSize: number = 20;

  constructor(init?: Partial<CustomerPaymentFilter>) {
    if (init) {
      Object.assign(this, init);

      // Conversion des dates
      if (init.startDate) {
        this.startDate = new Date(init.startDate);
      }
      if (init.endDate) {
        this.endDate = new Date(init.endDate);
      }

      // Validation des valeurs
      this.page = Math.max(1, this.page);
      this.pageSize = Math.max(1, Math.min(100, this.pageSize));
    }
  }

  /**
   * Vérifie si des filtres sont appliqués
   */
  hasFilters(): boolean {
    return !!(
      this.centreId ||
      this.startDate ||
      this.endDate ||
      this.method !== undefined ||
      this.minAmount !== undefined ||
      this.maxAmount !== undefined ||
      this.customerPhone ||
      this.vehiclePlate ||
      this.status !== undefined
    );
  }

  /**
   * Réinitialise les filtres (sauf pagination)
   */
  resetFilters(): void {
    this.centreId = undefined;
    this.startDate = undefined;
    this.endDate = undefined;
    this.method = undefined;
    this.minAmount = undefined;
    this.maxAmount = undefined;
    this.customerPhone = undefined;
    this.vehiclePlate = undefined;
    this.status = undefined;
  }

  /**
   * Clone l'objet filter
   */
  clone(): CustomerPaymentFilter {
    return new CustomerPaymentFilter({ ...this });
  }

  /**
   * Convertit en objet pour les requêtes HTTP
   */
  toQueryParams(): Record<string, string> {
    const params: Record<string, string> = {
      page: this.page.toString(),
      pageSize: this.pageSize.toString()
    };

    if (this.centreId) params["centreId"] = this.centreId;
    if (this.startDate) params["startDate"] = this.startDate.toISOString();
    if (this.endDate) params["endDate"] = this.endDate.toISOString();
    if (this.method !== undefined) params["method"] = this.method.toString();
    if (this.minAmount !== undefined) params["minAmount"] = this.minAmount.toString();
    if (this.maxAmount !== undefined) params["maxAmount"] = this.maxAmount.toString();
    if (this.customerPhone) params["customerPhone"] = this.customerPhone;
    if (this.vehiclePlate) params["vehiclePlate"] = this.vehiclePlate;
    if (this.status !== undefined) params["status"] = this.status.toString();

    return params;
  }
}

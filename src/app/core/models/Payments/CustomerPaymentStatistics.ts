import { PaymentMethod } from "./PaymentMethod";

/**
 * Customer payment statistics
 */
export interface CustomerPaymentStatistics {
  totalAmount: number;
  totalCount: number;
  countByMethod: Record<PaymentMethod, number>;
  amountByMethod: Record<PaymentMethod, number>;
  countByCentre: Record<string, number>;
  amountByCentre: Record<string, number>;
}

/**
 * Implémentation par défaut de CustomerPaymentStatistics
 */
export class CustomerPaymentStatistics implements CustomerPaymentStatistics {
  totalAmount: number = 0;
  totalCount: number = 0;
  countByMethod: Record<PaymentMethod, number> = {} as Record<PaymentMethod, number>;
  amountByMethod: Record<PaymentMethod, number> = {} as Record<PaymentMethod, number>;
  countByCentre: Record<string, number> = {};
  amountByCentre: Record<string, number> = {};

  constructor(init?: Partial<CustomerPaymentStatistics>) {
    if (init) {
      Object.assign(this, init);
    }
  }

  /**
   * Calcule le montant moyen par transaction
   */
  getAverageAmount(): number {
    return this.totalCount > 0 ? this.totalAmount / this.totalCount : 0;
  }

  /**
   * Récupère le pourcentage d'une méthode de paiement
   */
  getMethodPercentage(method: PaymentMethod): number {
    if (this.totalAmount === 0) return 0;
    const methodAmount = this.amountByMethod[method] || 0;
    return (methodAmount / this.totalAmount) * 100;
  }

  /**
   * Récupère le pourcentage d'un centre
   */
  getCentrePercentage(centreId: string): number {
    if (this.totalAmount === 0) return 0;
    const centreAmount = this.amountByCentre[centreId] || 0;
    return (centreAmount / this.totalAmount) * 100;
  }

  /**
   * Récupère la méthode de paiement la plus utilisée
   */
  getMostUsedMethod(): { method: PaymentMethod; count: number } | null {
    if (Object.keys(this.countByMethod).length === 0) return null;

    let maxMethod: PaymentMethod = PaymentMethod.CASH;
    let maxCount = 0;

    for (const [method, count] of Object.entries(this.countByMethod)) {
      if (count > maxCount) {
        maxMethod = Number(method) as PaymentMethod;
        maxCount = count;
      }
    }

    return { method: maxMethod, count: maxCount };
  }

  /**
   * Récupère le centre avec le plus de transactions
   */
  getTopCentre(): { centreId: string; count: number; amount: number } | null {
    if (Object.keys(this.countByCentre).length === 0) return null;

    let topCentreId = '';
    let maxCount = 0;
    let maxAmount = 0;

    for (const [centreId, count] of Object.entries(this.countByCentre)) {
      if (count > maxCount) {
        topCentreId = centreId;
        maxCount = count;
        maxAmount = this.amountByCentre[centreId] || 0;
      }
    }

    return { centreId: topCentreId, count: maxCount, amount: maxAmount };
  }
}

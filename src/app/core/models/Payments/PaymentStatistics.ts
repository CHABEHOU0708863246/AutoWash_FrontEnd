import { CustomerPayment } from "./CustomerPayment";
import { PaymentMethod } from "./PaymentMethod";

export class PaymentStatistics {
  static getTotalAmount(payments: CustomerPayment[]): number {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  }

  static getPaymentMethodDistribution(payments: CustomerPayment[]): Record<PaymentMethod, number> {
    const distribution: Record<PaymentMethod, number> = {
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.MOBILE_MONEY]: 0,
      [PaymentMethod.CREDIT_CARD]: 0,
      [PaymentMethod.BANK_TRANSFER]: 0,
      [PaymentMethod.CHEQUE]: 0,
      [PaymentMethod.LOYALTY_POINTS]: 0,
      [PaymentMethod.OTHER]: 0
    };

    payments.forEach(payment => {
      distribution[payment.method] += payment.amount;
    });

    return distribution;
  }

  static filterVerifiedPayments(payments: CustomerPayment[]): CustomerPayment[] {
    return payments.filter(p => p.isVerified);
  }
}

import { Payment } from "./Payment";
import { PaymentType } from "./PaymentType";

export class PaymentValidator {
  static validate(payment: Payment): string[] {
    const errors: string[] = [];

    if (!payment.userId) errors.push('userId is required');
    if (!payment.centreId) errors.push('centreId is required');
    if (payment.amount <= 0) errors.push('amount must be positive');
    if (payment.commission < 0) errors.push('commission cannot be negative');

    if (payment.isElectronicPayment() && !payment.transactionReference) {
      errors.push('transactionReference is required for electronic payments');
    }

    if (payment.paymentType === PaymentType.PerService && payment.sessionIds.length === 0) {
      errors.push('At least one sessionId is required for PerService payments');
    }

    return errors;
  }
}

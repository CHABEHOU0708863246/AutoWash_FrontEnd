import { CustomerPayment } from "./CustomerPayment";

export class PaymentValidation {
  static isValidPayment(payment: CustomerPayment): boolean {
    if (payment.amount <= 0) return false;
    if (!payment.washSessionId) return false;
    if (!payment.centreId) return false;
    if (!payment.receivedBy) return false;

    // Pour les paiements électroniques, une transaction ID est requise
    if (payment.isElectronicPayment() && !payment.transactionId) {
      return false;
    }

    return true;
  }
}

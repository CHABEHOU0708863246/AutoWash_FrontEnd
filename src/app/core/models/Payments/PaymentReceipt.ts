import { CustomerPayment } from "./CustomerPayment";

export class PaymentReceipt {
  static generateReceipt(payment: CustomerPayment): string {
    return `
      RECU DE PAIEMENT
      ----------------------------
      Centre: ${payment.centreId}
      Session: ${payment.washSessionId}
      Montant: ${payment.amount.toFixed(2)}
      Méthode: ${payment.method}
      ${payment.transactionId ? `Réf: ${payment.transactionId}` : ''}
      Date: ${payment.paymentDate.toLocaleString()}
      Caissier: ${payment.receivedBy}
      ${payment.customerPhone ? `Client: ${payment.customerPhone}` : ''}
      ${payment.vehiclePlate ? `Véhicule: ${payment.vehiclePlate}` : ''}
      Statut: ${payment.isVerified ? 'VERIFIE' : 'NON VERIFIE'}
    `;
  }
}

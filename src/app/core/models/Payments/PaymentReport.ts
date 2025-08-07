import { Payment } from "./Payment";

export class PaymentReport {
  static generatePaymentSlip(payment: Payment): string {
    return `
      FICHE DE PAIEMENT
      ----------------------------
      Centre: ${payment.centreId}
      Employé: ${payment.userId}
      Type: ${payment.paymentType}
      Méthode: ${payment.method}
      Montant: ${payment.amount.toFixed(2)}
      Commission: ${payment.commission.toFixed(2)}
      Total: ${payment.getTotalAmount().toFixed(2)}
      ${payment.transactionReference ? `Référence: ${payment.transactionReference}` : ''}
      Date: ${payment.paymentDate.toLocaleDateString()}
      ${payment.approvedBy ? `Approuvé par: ${payment.approvedBy}` : 'Non approuvé'}
      Sessions: ${payment.sessionIds.length}
      Créé par: ${payment.createdBy}
      Notes: ${payment.notes || 'Aucune'}
    `;
  }
}

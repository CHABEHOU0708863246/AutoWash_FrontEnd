import { PaymentMethod } from "./PaymentMethod";

export class PaymentInfo {
  method: PaymentMethod = PaymentMethod.CASH;
  amount: number = 0;
  transactionId?: string;
  applyLoyaltyDiscount: boolean = false;
  discountCode?: string;
  receivedBy: string = '';

  constructor(init?: Partial<PaymentInfo>) {
    Object.assign(this, init);
  }

  isElectronicPayment(): boolean {
    return [
      PaymentMethod.MOBILE_MONEY,
      PaymentMethod.BANK_TRANSFER,
      PaymentMethod.CREDIT_CARD
    ].includes(this.method);
  }

  validate(): string[] {
    const errors: string[] = [];

    if (this.amount <= 0) {
      errors.push('Le montant doit être positif');
    }

    if (!this.receivedBy) {
      errors.push('Le destinataire est requis');
    }

    if (this.isElectronicPayment() && !this.transactionId) {
      errors.push('Une référence de transaction est requise pour les paiements électroniques');
    }

    return errors;
  }

  getPaymentSummary(): string {
    return `
      Méthode: ${this.method}
      Montant: ${this.amount.toFixed(2)}
      ${this.transactionId ? `Référence: ${this.transactionId}` : ''}
      ${this.applyLoyaltyDiscount ? 'Remise fidélité appliquée' : ''}
      ${this.discountCode ? `Code promo: ${this.discountCode}` : ''}
      Reçu par: ${this.receivedBy}
    `;
  }
}

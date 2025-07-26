import { PaymentMethod } from "./PaymentMethod";

export class CustomerPayment {
  id?: string;
  washSessionId: string = '';
  centreId: string = '';
  amount: number = 0;
  method: PaymentMethod = PaymentMethod.CASH;
  transactionId?: string;
  paymentDate: Date = new Date();
  receivedBy: string = ''; // UserId du laveur/caissier
  isVerified: boolean = false; // Pour les paiements électroniques
  customerPhone?: string; // Pour fidélisation
  vehiclePlate?: string;
  customerId?: string;

  constructor(init?: Partial<CustomerPayment>) {
    Object.assign(this, init);

    // Conversion des dates
    if (init?.paymentDate) {
      this.paymentDate = new Date(init.paymentDate);
    }
  }

  verifyPayment(verifiedBy: string): void {
    this.isVerified = true;
    if (verifiedBy) {
      this.receivedBy = verifiedBy;
    }
  }

  markAsUnverified(): void {
    this.isVerified = false;
  }

  updatePaymentMethod(method: PaymentMethod, transactionId?: string): void {
    this.method = method;
    if (transactionId) {
      this.transactionId = transactionId;
    }

    // Pour les méthodes électroniques, on marque comme vérifié si transaction ID est fourni
    if (method !== PaymentMethod.CASH && transactionId) {
      this.isVerified = true;
    }
  }

  isElectronicPayment(): boolean {
    return [
      PaymentMethod.MOBILE_MONEY,
      PaymentMethod.CREDIT_CARD,
      PaymentMethod.BANK_TRANSFER
    ].includes(this.method);
  }

  getPaymentDetails(): string {
    return `${this.method}: ${this.amount.toFixed(2)} - ${this.paymentDate.toLocaleString()}`;
  }
}

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

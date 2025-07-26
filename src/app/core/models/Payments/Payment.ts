import { PaymentAttachment } from "./PaymentAttachment";
import { PaymentMethod } from "./PaymentMethod";
import { PaymentType } from "./PaymentType";

export class Payment {
  id?: string;
  userId: string = ''; // Laveur payé
  centreId: string = '';
  paymentType: PaymentType = PaymentType.PerService;
  method: PaymentMethod = PaymentMethod.CASH;
  sessionIds: string[] = [];
  amount: number = 0;
  commission: number = 0; // Si pourboire ou commission
  paymentDate: Date = new Date();
  transactionReference?: string;
  approvedBy?: string; // UserId du gérant qui a approuvé
  notes?: string;
  attachments: PaymentAttachment[] = [];

  // Audit
  createdAt: Date = new Date();
  createdBy: string = '';

  constructor(init?: Partial<Payment>) {
    Object.assign(this, init);

    // Conversion des dates
    if (init?.paymentDate) {
      this.paymentDate = new Date(init.paymentDate);
    }
    if (init?.createdAt) {
      this.createdAt = new Date(init.createdAt);
    }

    // Initialisation des pièces jointes
    if (init?.attachments) {
      this.attachments = init.attachments.map(a => new PaymentAttachment(a));
    }
  }

  approve(approvedByUserId: string): void {
    this.approvedBy = approvedByUserId;
  }

  addSession(sessionId: string): void {
    if (!this.sessionIds.includes(sessionId)) {
      this.sessionIds.push(sessionId);
    }
  }

  removeSession(sessionId: string): void {
    this.sessionIds = this.sessionIds.filter(id => id !== sessionId);
  }

  addAttachment(attachment: PaymentAttachment): void {
    this.attachments.push(new PaymentAttachment(attachment));
  }

  removeAttachment(fileUrl: string): void {
    this.attachments = this.attachments.filter(a => a.fileUrl !== fileUrl);
  }

  getTotalAmount(): number {
    return this.amount + this.commission;
  }

  isElectronicPayment(): boolean {
    return [
      PaymentMethod.MOBILE_MONEY,
      PaymentMethod.BANK_TRANSFER,
      PaymentMethod.CREDIT_CARD
    ].includes(this.method);
  }

  isApproved(): boolean {
    return !!this.approvedBy;
  }

  getPaymentDetails(): string {
    return `${this.paymentType} - ${this.method}: ${this.getTotalAmount().toFixed(2)}`;
  }
}

export class PaymentFactory {
  static createPerServicePayment(
    userId: string,
    centreId: string,
    sessionId: string,
    amount: number,
    createdBy: string
  ): Payment {
    return new Payment({
      userId,
      centreId,
      paymentType: PaymentType.PerService,
      sessionIds: [sessionId],
      amount,
      createdBy,
      createdAt: new Date()
    });
  }

  static createBonusPayment(
    userId: string,
    centreId: string,
    amount: number,
    notes: string,
    createdBy: string
  ): Payment {
    return new Payment({
      userId,
      centreId,
      paymentType: PaymentType.Bonus,
      amount,
      notes,
      createdBy,
      createdAt: new Date()
    });
  }
}

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

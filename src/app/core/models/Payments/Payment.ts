import { PaymentAttachment } from "./PaymentAttachment";
import { PaymentMethod } from "./PaymentMethod";
import { PaymentType } from "./PaymentType";

export class Payment {
  id?: string;
  userId: string = ''; // Laveur ou manager payé
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

  // Nouveaux champs
  isManagerPayment: boolean = false; // true si c'est un paiement manager
  deductions: number = 0; // Déductions appliquées au paiement

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

    // Initialisation des nouveaux champs avec valeurs par défaut
    this.isManagerPayment = init?.isManagerPayment ?? false;
    this.deductions = init?.deductions ?? 0;
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
    return this.amount + this.commission - this.deductions;
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
    const userType = this.isManagerPayment ? 'Manager' : 'Washer';
    return `${userType} - ${this.paymentType} - ${this.method}: ${this.getTotalAmount().toFixed(2)}`;
  }

  // Nouvelle méthode pour déterminer le type d'utilisateur
  getUserType(): string {
    return this.isManagerPayment ? 'Manager' : 'Washer';
  }

  // Nouvelle méthode pour le montant net après déductions
  getNetAmount(): number {
    return (this.amount + this.commission) - this.deductions;
  }

  // Nouvelle méthode pour vérifier si c'est un paiement manager
  isManager(): boolean {
    return this.isManagerPayment;
  }

  // Nouvelle méthode pour vérifier si c'est un paiement laveur
  isWasher(): boolean {
    return !this.isManagerPayment;
  }
}

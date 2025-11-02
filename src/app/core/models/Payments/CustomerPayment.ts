import { PaymentMethod } from "./PaymentMethod";
import { PaymentStatus } from "./PaymentStatus";

export class CustomerPayment {
  id?: string;
  washSessionId: string = '';
  centreId: string = '';
  amount: number = 0;
  method: PaymentMethod = PaymentMethod.CASH;
  transactionId?: string;
  cinetPayTransactionId?: string = '';
  paymentDate: Date = new Date();
  receivedBy: string = ''; // UserId du laveur/caissier
  isVerified: boolean = false; // Pour les paiements électroniques
  status: PaymentStatus = PaymentStatus.Pending; // Ajouter cette propriété
  customerPhone: string = ''; // Pour fidélisation
  vehiclePlate?: string;
  customerId?: string;

  // Audit fields
  createdAt: Date = new Date();
  updatedAt: Date = new Date();

  constructor(init?: Partial<CustomerPayment>) {
    if (init) {
      Object.assign(this, init);

      // Conversion des dates
      if (init.paymentDate) {
        this.paymentDate = new Date(init.paymentDate);
      }
      if (init.createdAt) {
        this.createdAt = new Date(init.createdAt);
      }
      if (init.updatedAt) {
        this.updatedAt = new Date(init.updatedAt);
      }
    }
  }

  verifyPayment(verifiedBy: string): void {
    this.isVerified = true;
    this.status = PaymentStatus.Accepted;
    if (verifiedBy) {
      this.receivedBy = verifiedBy;
    }
    this.updatedAt = new Date();
  }

  markAsUnverified(): void {
    this.isVerified = false;
    this.updatedAt = new Date();
  }

  updatePaymentMethod(method: PaymentMethod, transactionId?: string): void {
    this.method = method;
    if (transactionId) {
      this.transactionId = transactionId;
    }

    // Pour les méthodes électroniques, on marque comme vérifié si transaction ID est fourni
    if (method !== PaymentMethod.CASH && transactionId) {
      this.isVerified = true;
      this.status = PaymentStatus.Accepted;
    }

    this.updatedAt = new Date();
  }

  updateStatus(status: PaymentStatus): void {
    this.status = status;
    this.updatedAt = new Date();
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

  // Vérifie si le paiement est complètement vérifié et accepté
  isFullyVerified(): boolean {
    return this.isVerified && this.status === PaymentStatus.Accepted;
  }

  // Vérifie si le paiement est en attente
  isPending(): boolean {
    return this.status === PaymentStatus.Pending;
  }

  // Vérifie si le paiement a échoué
  isFailed(): boolean {
    return this.status === PaymentStatus.Failed || this.status === PaymentStatus.Refused;
  }
}

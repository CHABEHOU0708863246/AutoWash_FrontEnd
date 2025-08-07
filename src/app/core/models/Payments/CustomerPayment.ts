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


import { CustomerInfo } from "../Customer/CustomerInfo";
import { PaymentMethod } from "../Payments/PaymentMethod";

export class WashSession {
  id: string | undefined;
  centreId: string = '';
  serviceId: string = '';
  vehicleTypeId: string = '';
  washerId?: string;
  customer: CustomerInfo = new CustomerInfo();
  vehiclePlate: string = '';
  vehicleBrand?: string;
  vehicleColor?: string;
  price: number = 0;
  amountPaid: number = 0;
  paymentMethod: PaymentMethod = PaymentMethod.CASH;
  transactionId?: string;
  isPaid: boolean = false;
  isCompleted: boolean = false;
  isCancelled: boolean = false;
  scheduledStart: Date = new Date();
  actualStart?: Date;
  actualEnd?: Date;
  notes?: string;
  cancellationReason?: string;
  createdBy: string = '';
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
  isAdminOverride: boolean = false;
  washDurationMinutes?: number;
  customerRating?: number;
  customerFeedback?: string;

  constructor(init?: Partial<WashSession>) {
    Object.assign(this, init);

    // Initialisation des sous-objets
    if (init?.customer) {
      this.customer = new CustomerInfo(init.customer);
    }

    // Conversion des dates
    if (init?.scheduledStart) {
      this.scheduledStart = new Date(init.scheduledStart);
    }
    if (init?.actualStart) {
      this.actualStart = new Date(init.actualStart);
    }
    if (init?.actualEnd) {
      this.actualEnd = new Date(init.actualEnd);
    }
    if (init?.createdAt) {
      this.createdAt = new Date(init.createdAt);
    }
    if (init?.updatedAt) {
      this.updatedAt = new Date(init.updatedAt);
    }
  }

  markAsStarted(): void {
    this.actualStart = new Date();
    this.updatedAt = new Date();
  }

  markAsCompleted(durationMinutes: number, rating?: number, feedback?: string): void {
    this.actualEnd = new Date();
    this.isCompleted = true;
    this.washDurationMinutes = durationMinutes;
    this.customerRating = rating;
    this.customerFeedback = feedback;
    this.updatedAt = new Date();
  }

  cancel(reason: string): void {
    this.isCancelled = true;
    this.cancellationReason = reason;
    this.updatedAt = new Date();

    if (!this.actualStart && this.scheduledStart > new Date()) {
      this.washDurationMinutes = Math.floor(
        (this.scheduledStart.getTime() - new Date().getTime()) / (1000 * 60)
      );
    }
  }

  isInProgress(): boolean {
    return !!this.actualStart && !this.actualEnd && !this.isCancelled;
  }

  isScheduled(): boolean {
    return !this.actualStart && !this.isCancelled;
  }

  processPayment(
    amount: number,
    method: PaymentMethod,
    transactionId?: string
  ): void {
    this.amountPaid = amount;
    this.paymentMethod = method;
    this.transactionId = transactionId;
    this.isPaid = true;
    this.updatedAt = new Date();
  }

  getDurationMinutes(): number {
    if (this.washDurationMinutes !== undefined) {
      return this.washDurationMinutes;
    }

    if (this.actualStart && this.actualEnd) {
      return Math.floor(
        (this.actualEnd.getTime() - this.actualStart.getTime()) / (1000 * 60)
      );
    }

    return 0;
  }

  getStatus(): string {
    if (this.isCancelled) return 'Annulé';
    if (this.isCompleted) return 'Terminé';
    if (this.isInProgress()) return 'En cours';
    if (this.isPaid) return 'Payé (en attente)';
    return 'Non payé';
  }

  validate(): string[] {
    const errors: string[] = [];

    if (!this.centreId) errors.push('centreId est requis');
    if (!this.serviceId) errors.push('serviceId est requis');
    if (!this.vehicleTypeId) errors.push('vehicleTypeId est requis');
    if (!this.vehiclePlate) errors.push('vehiclePlate est requis');
    if (!this.customer.phoneNumber) errors.push('customer.phoneNumber est requis');
    if (this.price <= 0) errors.push('price doit être positif');
    if (this.amountPaid < 0) errors.push('amountPaid ne peut pas être négatif');

    return errors;
  }
}

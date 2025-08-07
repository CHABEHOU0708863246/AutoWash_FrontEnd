export class CustomerInfo {
  customerId?: string;
  phoneNumber: string = '';
  name?: string;
  email?: string;
  loyaltyPointsUsed: number = 0;
  loyaltyDiscountApplied: number = 0;

  constructor(init?: Partial<CustomerInfo>) {
    Object.assign(this, init);
  }

  // Méthodes utilitaires
  hasLoyaltyDiscount(): boolean {
    return this.loyaltyDiscountApplied > 0;
  }

  hasLoyaltyPointsUsed(): boolean {
    return this.loyaltyPointsUsed > 0;
  }

  isExistingCustomer(): boolean {
    return !!this.customerId;
  }
}

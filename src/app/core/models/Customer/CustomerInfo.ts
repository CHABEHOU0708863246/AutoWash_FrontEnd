export class CustomerInfo {
  customerId?: string; // Si client existant
  phoneNumber: string = '';
  name?: string;
  email?: string;
  loyaltyPointsUsed: number = 0;
  loyaltyDiscountApplied: number = 0;

  constructor(init?: Partial<CustomerInfo>) {
    Object.assign(this, init);
  }

  getCustomerIdentifier(): string {
    return this.customerId || this.phoneNumber;
  }

  applyLoyaltyDiscount(points: number, discountAmount: number): void {
    this.loyaltyPointsUsed = points;
    this.loyaltyDiscountApplied = discountAmount;
  }

  clearLoyaltyDiscount(): void {
    this.loyaltyPointsUsed = 0;
    this.loyaltyDiscountApplied = 0;
  }
}

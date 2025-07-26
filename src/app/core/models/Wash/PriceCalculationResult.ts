export class PriceCalculationResult {
  basePrice: number = 0;
  vehicleMultiplier: number = 1;
  subTotal: number = 0;
  loyaltyDiscount: number = 0;
  finalPrice: number = 0;
  loyaltyDiscountApplied: boolean = false;
  customerWashCount: number = 0;

  constructor(init?: Partial<PriceCalculationResult>) {
    Object.assign(this, init);

    // Calcul automatique si certaines valeurs sont fournies
    if (init?.basePrice !== undefined && init?.vehicleMultiplier !== undefined) {
      this.calculate();
    }
  }

  calculate(): void {
    this.subTotal = this.basePrice * this.vehicleMultiplier;
    this.finalPrice = this.subTotal - this.loyaltyDiscount;
  }

  applyLoyaltyDiscount(discountPercentage: number): void {
    this.loyaltyDiscount = this.subTotal * (discountPercentage / 100);
    this.loyaltyDiscountApplied = true;
    this.calculate();
  }

  removeLoyaltyDiscount(): void {
    this.loyaltyDiscount = 0;
    this.loyaltyDiscountApplied = false;
    this.calculate();
  }

  getSummary(): string {
    return `Base: ${this.basePrice.toFixed(2)} × ${this.vehicleMultiplier.toFixed(2)} = ${this.subTotal.toFixed(2)} - ${this.loyaltyDiscount.toFixed(2)} = ${this.finalPrice.toFixed(2)}`;
  }

  getDetailedBreakdown(): string {
    return `
      DÉTAIL DU CALCUL
      ----------------------------
      Prix de base: ${this.basePrice.toFixed(2)}
      Multiplicateur véhicule: ${this.vehicleMultiplier.toFixed(2)}
      Sous-total: ${this.subTotal.toFixed(2)}
      Remise fidélité: ${this.loyaltyDiscount.toFixed(2)} (${this.loyaltyDiscountApplied ? 'appliquée' : 'non appliquée'})
      Total final: ${this.finalPrice.toFixed(2)}
      Nombre de lavages client: ${this.customerWashCount}
    `;
  }
}

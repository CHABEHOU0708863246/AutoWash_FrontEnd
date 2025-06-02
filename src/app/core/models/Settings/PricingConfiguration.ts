export class PricingConfiguration {
  currency: string;
  currencySymbol: string;
  showPricesWithTax: boolean;
  taxRate: number;
  allowNegotiation: boolean;
  minimumPrice: number;

  constructor(init?: Partial<PricingConfiguration>) {
    this.currency = init?.currency || 'FCFA';
    this.currencySymbol = init?.currencySymbol || '₣';
    this.showPricesWithTax = init?.showPricesWithTax ?? true;
    this.taxRate = init?.taxRate || 0;
    this.allowNegotiation = init?.allowNegotiation || false;
    this.minimumPrice = init?.minimumPrice || 0;
  }
}

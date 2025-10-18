export class ProfitabilityAnalysis {
  id?: string;
  centreId: string = '';
  centreName: string = '';
  startDate: Date = new Date();
  endDate: Date = new Date();
  totalRevenue: number = 0;
  directCosts: number = 0;
  operatingExpenses: number = 0;
  createdAt: Date = new Date();
  updatedAt: Date = new Date();

  constructor(init?: Partial<ProfitabilityAnalysis>) {
    if (init) {
      // Assigner manuellement les propriétés
      this.id = init.id ?? this.id;
      this.centreId = init.centreId ?? this.centreId;
      this.centreName = init.centreName ?? this.centreName;
      this.totalRevenue = init.totalRevenue ?? this.totalRevenue;
      this.directCosts = init.directCosts ?? this.directCosts;
      this.operatingExpenses = init.operatingExpenses ?? this.operatingExpenses;

      // Conversion des dates
      if (init.startDate) {
        this.startDate = new Date(init.startDate);
      }
      if (init.endDate) {
        this.endDate = new Date(init.endDate);
      }
      if (init.createdAt) {
        this.createdAt = new Date(init.createdAt);
      }
      if (init.updatedAt) {
        this.updatedAt = new Date(init.updatedAt);
      }
    }
  }

  // Getters calculés - ne peuvent pas être modifiés directement
  get grossMargin(): number {
    return this.totalRevenue - this.directCosts;
  }

  get grossMarginPercentage(): number {
    return this.totalRevenue > 0 ? (this.grossMargin / this.totalRevenue) * 100 : 0;
  }

  get netProfit(): number {
    return this.grossMargin - this.operatingExpenses;
  }

  get netMarginPercentage(): number {
    return this.totalRevenue > 0 ? (this.netProfit / this.totalRevenue) * 100 : 0;
  }

  get roi(): number {
    const totalInvestment = this.directCosts + this.operatingExpenses;
    return totalInvestment > 0 ? (this.netProfit / totalInvestment) * 100 : 0;
  }

  formatCurrency(amount: number): string {
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }
}

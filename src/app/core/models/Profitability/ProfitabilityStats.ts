export class ProfitabilityStats {
  totalRevenue: number = 0;
  totalDirectCosts: number = 0;
  totalOperatingExpenses: number = 0;
  startDate: Date = new Date();
  endDate: Date = new Date();

  constructor(init?: Partial<ProfitabilityStats>) {
    // N'utilise pas Object.assign directement car il essaie de définir les getters
    if (init) {
      // Assigner manuellement les propriétés directes
      this.totalRevenue = init.totalRevenue ?? this.totalRevenue;
      this.totalDirectCosts = init.totalDirectCosts ?? this.totalDirectCosts;
      this.totalOperatingExpenses = init.totalOperatingExpenses ?? this.totalOperatingExpenses;

      // Conversion des dates
      if (init.startDate) {
        this.startDate = new Date(init.startDate);
      }
      if (init.endDate) {
        this.endDate = new Date(init.endDate);
      }
    }
  }

  // Les getters restent inchangés - ils sont calculés automatiquement
  get totalGrossMargin(): number {
    return this.totalRevenue - this.totalDirectCosts;
  }

  get grossMarginPercentage(): number {
    return this.totalRevenue > 0 ? (this.totalGrossMargin / this.totalRevenue) * 100 : 0;
  }

  get totalNetProfit(): number {
    return this.totalGrossMargin - this.totalOperatingExpenses;
  }

  get netMarginPercentage(): number {
    return this.totalRevenue > 0 ? (this.totalNetProfit / this.totalRevenue) * 100 : 0;
  }

  get averageROI(): number {
    const totalInvestment = this.totalDirectCosts + this.totalOperatingExpenses;
    return totalInvestment > 0 ? (this.totalNetProfit / totalInvestment) * 100 : 0;
  }

  // Méthodes utilitaires
  formatCurrency(amount: number): string {
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  getSummary(): { label: string; value: string; isPositive?: boolean }[] {
    return [
      { label: 'Revenus Totaux', value: this.formatCurrency(this.totalRevenue) },
      { label: 'Coûts Directs', value: this.formatCurrency(this.totalDirectCosts) },
      { label: 'Marge Brute', value: this.formatCurrency(this.totalGrossMargin) },
      { label: 'Marge Brute %', value: this.formatPercentage(this.grossMarginPercentage), isPositive: this.grossMarginPercentage > 0 },
      { label: 'Frais Exploitation', value: this.formatCurrency(this.totalOperatingExpenses) },
      { label: 'Bénéfice Net', value: this.formatCurrency(this.totalNetProfit), isPositive: this.totalNetProfit > 0 },
      { label: 'Marge Nette %', value: this.formatPercentage(this.netMarginPercentage), isPositive: this.netMarginPercentage > 0 },
      { label: 'ROI Moyen', value: this.formatPercentage(this.averageROI), isPositive: this.averageROI > 0 }
    ];
  }
}

import { ProfitabilityAnalysis } from "../../../core/models/Profitability/ProfitabilityAnalysis";
import { ProfitabilityStats } from "../../../core/models/Profitability/ProfitabilityStats";

export class ProfitabilityExportModel {
  centre: string = '';
  revenus: string = '';
  coutsDirects: string = '';
  margeBrute: string = '';
  fraisExploitation: string = '';
  beneficeNet: string = '';
  margeNette: string = '';
  roi: string = '';
  periode: string = '';

  constructor(init?: Partial<ProfitabilityExportModel>) {
    Object.assign(this, init);
  }

  // Méthode pour créer un modèle d'export à partir d'une analyse
  static fromAnalysis(analysis: ProfitabilityAnalysis, periode: string): ProfitabilityExportModel {
    const formatCurrency = (amount: number) => `${amount.toLocaleString('fr-FR')} FCFA`;
    const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

    return new ProfitabilityExportModel({
      centre: analysis.centreName,
      revenus: formatCurrency(analysis.totalRevenue),
      coutsDirects: formatCurrency(analysis.directCosts),
      margeBrute: formatCurrency(analysis.grossMargin),
      fraisExploitation: formatCurrency(analysis.operatingExpenses),
      beneficeNet: formatCurrency(analysis.netProfit),
      margeNette: formatPercentage(analysis.netMarginPercentage),
      roi: formatPercentage(analysis.roi),
      periode: periode
    });
  }

  // Méthode pour créer un modèle d'export pour les totaux
  static fromStats(stats: ProfitabilityStats, periode: string): ProfitabilityExportModel {
    const formatCurrency = (amount: number) => `${amount.toLocaleString('fr-FR')} FCFA`;
    const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

    return new ProfitabilityExportModel({
      centre: 'TOTAL',
      revenus: formatCurrency(stats.totalRevenue),
      coutsDirects: formatCurrency(stats.totalDirectCosts),
      margeBrute: formatCurrency(stats.totalGrossMargin),
      fraisExploitation: formatCurrency(stats.totalOperatingExpenses),
      beneficeNet: formatCurrency(stats.totalNetProfit),
      margeNette: formatPercentage(stats.netMarginPercentage),
      roi: formatPercentage(stats.averageROI),
      periode: periode
    });
  }
}

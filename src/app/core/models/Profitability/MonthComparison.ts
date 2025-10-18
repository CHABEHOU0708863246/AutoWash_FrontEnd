import { ProfitabilityStats } from "./ProfitabilityStats";

export interface MonthComparison {
  currentMonth: ProfitabilityStats;
  previousMonth: ProfitabilityStats;
  changes: {
    revenueChange: number;
    revenueChangePercent: number;
    profitChange: number;
    profitChangePercent: number;
  };
}

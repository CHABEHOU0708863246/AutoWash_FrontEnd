export class DashboardKpiDto {
  todayRevenue: number;
  totalRevenue: number;
  todayWashCount: number;
  totalWashCount: number;
  activeWashers: number;
  monthlyProfit: number;

  constructor(
    todayRevenue: number = 0,
    totalRevenue: number = 0,
    todayWashCount: number = 0,
    totalWashCount: number = 0,
    activeWashers: number = 0,
    monthlyProfit: number = 0
  ) {
    this.todayRevenue = todayRevenue;
    this.totalRevenue = totalRevenue;
    this.todayWashCount = todayWashCount;
    this.totalWashCount = totalWashCount;
    this.activeWashers = activeWashers;
    this.monthlyProfit = monthlyProfit;
  }
}

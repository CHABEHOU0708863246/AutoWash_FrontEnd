export class WeeklyComparisonDto {
  currentWeekRevenue: number;
  previousWeekRevenue: number;
  revenueGrowthPercentage: number;
  currentWeekWashCount: number;
  previousWeekWashCount: number;
  washCountGrowthPercentage: number;

  constructor(
    currentWeekRevenue: number = 0,
    previousWeekRevenue: number = 0,
    revenueGrowthPercentage: number = 0,
    currentWeekWashCount: number = 0,
    previousWeekWashCount: number = 0,
    washCountGrowthPercentage: number = 0
  ) {
    this.currentWeekRevenue = currentWeekRevenue;
    this.previousWeekRevenue = previousWeekRevenue;
    this.revenueGrowthPercentage = revenueGrowthPercentage;
    this.currentWeekWashCount = currentWeekWashCount;
    this.previousWeekWashCount = previousWeekWashCount;
    this.washCountGrowthPercentage = washCountGrowthPercentage;
  }
}

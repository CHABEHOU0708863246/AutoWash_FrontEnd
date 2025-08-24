import { DashboardAlert } from "./DashboardAlert";

export class DashboardSnapshot {
  id?: string;
  centreId: string;
  todayRevenue: number;
  todayWashCount: number;
  activeWashers: number;
  monthlyProfit: number;
  last7DaysRevenue: number[];
  last7DaysWashCount: number[];
  lastUpdated: Date;
  alerts: DashboardAlert[];

  constructor(
    centreId: string = '',
    todayRevenue: number = 0,
    todayWashCount: number = 0,
    activeWashers: number = 0,
    monthlyProfit: number = 0,
    last7DaysRevenue: number[] = Array(7).fill(0),
    last7DaysWashCount: number[] = Array(7).fill(0),
    lastUpdated: Date = new Date(),
    alerts: DashboardAlert[] = []
  ) {
    this.centreId = centreId;
    this.todayRevenue = todayRevenue;
    this.todayWashCount = todayWashCount;
    this.activeWashers = activeWashers;
    this.monthlyProfit = monthlyProfit;
    this.last7DaysRevenue = last7DaysRevenue;
    this.last7DaysWashCount = last7DaysWashCount;
    this.lastUpdated = lastUpdated;
    this.alerts = alerts;
  }
}

export class VehicleTypeStatistics {
  id?: string;
  centreId: string = '';
  vehicleTypeId: string = '';
  statDate: Date = new Date();
  dailyWashes: number = 0;
  dailyRevenue: number = 0;
  weeklyWashes: number = 0;
  weeklyRevenue: number = 0;
  monthlyWashes: number = 0;
  monthlyRevenue: number = 0;
  averageServiceTime: number = 0;
  averageWaitTime: number = 0;
  cancellationCount: number = 0;
  cancellationRate: number = 0;
  createdAt: Date = new Date();
  updatedAt: Date = new Date();

  constructor(init?: Partial<VehicleTypeStatistics>) {
    Object.assign(this, init);
  }
}

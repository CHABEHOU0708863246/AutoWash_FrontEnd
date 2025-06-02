export class ServicePricing {
  serviceId: string;
  vehicleTypePrices: Map<string, number>;
  basePrice: number;
  useVehicleMultiplier: boolean;

  constructor(init?: Partial<ServicePricing>) {
    this.serviceId = init?.serviceId || '';
    this.vehicleTypePrices = new Map<string, number>();
    if (init?.vehicleTypePrices) {
      Object.entries(init.vehicleTypePrices).forEach(([key, value]) => {
        this.vehicleTypePrices.set(key, value);
      });
    }
    this.basePrice = init?.basePrice || 0;
    this.useVehicleMultiplier = init?.useVehicleMultiplier ?? true;
  }
}

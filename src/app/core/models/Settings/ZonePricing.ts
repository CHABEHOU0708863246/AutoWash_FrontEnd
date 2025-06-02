export class ZonePricing {
  zoneName: string;
  priceMultiplier: number;
  applicableServices: string[];

  constructor(init?: Partial<ZonePricing>) {
    this.zoneName = init?.zoneName || '';
    this.priceMultiplier = init?.priceMultiplier || 1.0;
    this.applicableServices = init?.applicableServices || [];
  }
}

export class DiscountRule {
  id: string;
  name: string;
  type: DiscountType;
  value: number;
  startDate?: Date;
  endDate?: Date;
  applicableServices: string[];
  applicableVehicleTypes: string[];
  isActive: boolean;
  minimumSessions: number;

  constructor(init?: Partial<DiscountRule>) {
    this.id = init?.id || this.generateGuid();
    this.name = init?.name || '';
    this.type = init?.type || DiscountType.Percentage;
    this.value = init?.value || 0;
    this.startDate = init?.startDate;
    this.endDate = init?.endDate;
    this.applicableServices = init?.applicableServices || [];
    this.applicableVehicleTypes = init?.applicableVehicleTypes || [];
    this.isActive = init?.isActive ?? true;
    this.minimumSessions = init?.minimumSessions || 0;
  }

  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}


export enum DiscountType {
  Percentage = 'Percentage',
  FixedAmount = 'FixedAmount',
  BuyXGetY = 'BuyXGetY'
}

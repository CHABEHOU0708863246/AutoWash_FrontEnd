import { PaymentMethod } from "./PaymentMethod";

export class MonthlyPaymentFilter {
  centreId?: string;
  washerId?: string;
  managerId?: string;
  month?: number;
  year?: number;
  method?: PaymentMethod;
  startDate?: Date;
  endDate?: Date;
  isValidated?: boolean;
  userType?: string; // "Washer", "Manager", ou null pour tous

  constructor(init?: Partial<MonthlyPaymentFilter>) {
    Object.assign(this, init);

    if (init?.startDate) {
      this.startDate = new Date(init.startDate);
    }

    if (init?.endDate) {
      this.endDate = new Date(init.endDate);
    }
  }
}

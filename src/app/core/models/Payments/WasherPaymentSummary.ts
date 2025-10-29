export class WasherPaymentSummary {
  washerId: string = '';
  washerName: string = '';
  month: number = 0;
  year: number = 0;
  totalAmount: number = 0;
  totalCommission: number = 0;
  totalSessions: number = 0;
  finalAmount: number = 0;
  sessionIds: string[] = [];
  calculationDate: Date = new Date();

  constructor(init?: Partial<WasherPaymentSummary>) {
    Object.assign(this, init);

    if (init?.calculationDate) {
      this.calculationDate = new Date(init.calculationDate);
    }

    this.sessionIds = init?.sessionIds ?? [];
  }
}

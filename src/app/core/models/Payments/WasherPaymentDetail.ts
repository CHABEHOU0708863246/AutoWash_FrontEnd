export class WasherPaymentDetail {
  washerId: string = '';
  washerName: string = '';
  totalAmount: number = 0;
  commission: number = 0;
  sessionsCount: number = 0;
  isValidated: boolean = false;
  paymentDate?: Date;

  constructor(init?: Partial<WasherPaymentDetail>) {
    Object.assign(this, init);

    if (init?.paymentDate) {
      this.paymentDate = new Date(init.paymentDate);
    }
  }
}

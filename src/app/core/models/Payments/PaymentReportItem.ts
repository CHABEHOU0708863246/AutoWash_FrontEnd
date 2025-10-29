export class PaymentReportItem {
  userId: string = '';
  userName: string = '';
  userType: string = ''; // "Washer" ou "Manager"
  baseAmount: number = 0;
  commission: number = 0;
  bonus: number = 0;
  totalAmount: number = 0;
  sessionsCount: number = 0;
  isValidated: boolean = false;
  approvedBy: string = '';
  paymentDate?: Date;

  constructor(init?: Partial<PaymentReportItem>) {
    Object.assign(this, init);

    if (init?.paymentDate) {
      this.paymentDate = new Date(init.paymentDate);
    }
  }
}

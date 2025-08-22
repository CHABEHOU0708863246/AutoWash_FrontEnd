export class ExpenseRequest {
  type: string = '';
  description: string = '';
  amount: number = 0;
  date: Date = new Date();
  centreId: string = '';

  constructor(init?: Partial<ExpenseRequest>) {
    Object.assign(this, init);
  }
}

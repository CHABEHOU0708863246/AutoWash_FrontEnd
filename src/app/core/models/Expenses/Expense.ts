export class Expense {
  id?: string;
  type: string = '';
  description: string = '';
  amount: number = 0;
  date: Date = new Date();
  centreId: string = '';

  constructor(init?: Partial<Expense>) {
    Object.assign(this, init);
  }
}

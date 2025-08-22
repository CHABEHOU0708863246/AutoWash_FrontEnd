export class ExpenseType {
  id?: string;
  centreId: string = '';
  typeName: string = '';
  createdAt: Date = new Date();

  constructor(init?: Partial<ExpenseType>) {
    Object.assign(this, init);
  }
}

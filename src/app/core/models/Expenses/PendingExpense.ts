import { Expense } from "./Expense";

export class PendingExpense extends Expense {
  status: string = 'Pending';
  approverId?: string;
  approvalReason?: string;
  approvalDate?: Date;
  submittedBy: string = '';

  constructor(init?: Partial<PendingExpense>) {
    super(init);
    Object.assign(this, init);
  }
}

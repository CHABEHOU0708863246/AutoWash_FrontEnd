export class AuditSummary {
  totalAmount: number = 0;
  totalCommission: number = 0;
  totalPayments: number = 0;
  totalSessions: number = 0;
  validatedPayments: number = 0;
  pendingPayments: number = 0;

  constructor(init?: Partial<AuditSummary>) {
    Object.assign(this, init);
  }
}

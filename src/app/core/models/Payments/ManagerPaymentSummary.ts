export class ManagerPaymentSummary {
  managerId: string = '';
  managerName: string = '';
  month: number = 0;
  year: number = 0;
  baseSalary: number = 0;
  bonusAmount: number = 0;
  deductions: number = 0;
  finalAmount: number = 0;
  totalWashersManaged: number = 0;
  totalSessionsSupervised: number = 0;
  centrePerformanceBonus: number = 0;
  performanceNotes: string = '';
  calculationDate: Date = new Date();

  constructor(init?: Partial<ManagerPaymentSummary>) {
    Object.assign(this, init);

    if (init?.calculationDate) {
      this.calculationDate = new Date(init.calculationDate);
    }
  }
}

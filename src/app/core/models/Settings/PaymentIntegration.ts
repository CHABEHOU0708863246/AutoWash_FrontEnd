export class PaymentIntegration {
  mobileMoneyEnabled: boolean;
  mobileMoneyProvider: string;
  apiKey: string;
  bankTransferEnabled: boolean;

  constructor(init?: Partial<PaymentIntegration>) {
    this.mobileMoneyEnabled = init?.mobileMoneyEnabled || false;
    this.mobileMoneyProvider = init?.mobileMoneyProvider || '';
    this.apiKey = init?.apiKey || '';
    this.bankTransferEnabled = init?.bankTransferEnabled || false;
  }
}

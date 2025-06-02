import { EmailIntegration } from "./EmailIntegration";
import { PaymentIntegration } from "./PaymentIntegration";
import { SmsIntegration } from "./SmsIntegration";

export class IntegrationSettings {
  payment: PaymentIntegration;
  email: EmailIntegration;
  sms: SmsIntegration;

  constructor(init?: Partial<IntegrationSettings>) {
    this.payment = new PaymentIntegration(init?.payment);
    this.email = new EmailIntegration(init?.email);
    this.sms = new SmsIntegration(init?.sms);
  }
}

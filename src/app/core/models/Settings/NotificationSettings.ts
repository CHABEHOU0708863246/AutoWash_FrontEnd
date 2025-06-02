import { NotificationRule } from "./NotificationRule";

export class NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  rules: NotificationRule[];

  constructor(init?: Partial<NotificationSettings>) {
    this.emailEnabled = init?.emailEnabled ?? true;
    this.smsEnabled = init?.smsEnabled || false;
    this.pushEnabled = init?.pushEnabled ?? true;
    this.rules = init?.rules?.map(r => new NotificationRule(r)) || [];
  }
}

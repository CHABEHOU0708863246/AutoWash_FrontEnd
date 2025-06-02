export class NotificationRule {
  eventType: string;
  isEnabled: boolean;
  recipients: string[];
  channel: NotificationChannel;

  constructor(init?: Partial<NotificationRule>) {
    this.eventType = init?.eventType || '';
    this.isEnabled = init?.isEnabled ?? true;
    this.recipients = init?.recipients || [];
    this.channel = init?.channel || NotificationChannel.Email;
  }
}


export enum NotificationChannel {
  Email = 'Email',
  Sms = 'Sms',
  Push = 'Push',
  All = 'All'
}

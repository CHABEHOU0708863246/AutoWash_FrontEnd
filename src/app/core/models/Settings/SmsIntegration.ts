export class SmsIntegration {
  provider: string;
  apiKey: string;
  senderId: string;

  constructor(init?: Partial<SmsIntegration>) {
    this.provider = init?.provider || '';
    this.apiKey = init?.apiKey || '';
    this.senderId = init?.senderId || '';
  }
}

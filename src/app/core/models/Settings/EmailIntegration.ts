export class EmailIntegration {
  smtpServer: string;
  smtpPort: number;
  username: string;
  password: string;
  useSsl: boolean;

  constructor(init?: Partial<EmailIntegration>) {
    this.smtpServer = init?.smtpServer || '';
    this.smtpPort = init?.smtpPort || 587;
    this.username = init?.username || '';
    this.password = init?.password || '';
    this.useSsl = init?.useSsl ?? true;
  }
}

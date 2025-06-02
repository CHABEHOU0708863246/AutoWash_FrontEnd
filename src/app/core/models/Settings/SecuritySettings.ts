export class SecuritySettings {
  sessionTimeoutMinutes: number;
  requirePasswordChange: boolean;
  passwordExpiryDays: number;
  maxLoginAttempts: number;
  enableTwoFactor: boolean;
  allowedIpRanges: string[];

  constructor(init?: Partial<SecuritySettings>) {
    this.sessionTimeoutMinutes = init?.sessionTimeoutMinutes || 480;
    this.requirePasswordChange = init?.requirePasswordChange || false;
    this.passwordExpiryDays = init?.passwordExpiryDays || 90;
    this.maxLoginAttempts = init?.maxLoginAttempts || 5;
    this.enableTwoFactor = init?.enableTwoFactor || false;
    this.allowedIpRanges = init?.allowedIpRanges || [];
  }
}

export class GeneralSettings {
  applicationName: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  logoUrl: string;
  language: string;
  timeZone: string;
  dateFormat: string;
  timeFormat: string;

  constructor(init?: Partial<GeneralSettings>) {
    this.applicationName = init?.applicationName || 'AutoWash';
    this.companyName = init?.companyName || '';
    this.companyAddress = init?.companyAddress || '';
    this.companyPhone = init?.companyPhone || '';
    this.companyEmail = init?.companyEmail || '';
    this.logoUrl = init?.logoUrl || '';
    this.language = init?.language || 'fr-FR';
    this.timeZone = init?.timeZone || 'UTC';
    this.dateFormat = init?.dateFormat || 'dd/MM/yyyy';
    this.timeFormat = init?.timeFormat || 'HH:mm';
  }
}

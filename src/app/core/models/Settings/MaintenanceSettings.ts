export class MaintenanceSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceStartTime?: Date;
  maintenanceEndTime?: Date;
  autoBackupEnabled: boolean;
  backupRetentionDays: number;
  backupTime: string; // Format "HH:mm"

  constructor(init?: Partial<MaintenanceSettings>) {
    this.maintenanceMode = init?.maintenanceMode || false;
    this.maintenanceMessage = init?.maintenanceMessage || 'Application en maintenance';
    this.maintenanceStartTime = init?.maintenanceStartTime;
    this.maintenanceEndTime = init?.maintenanceEndTime;
    this.autoBackupEnabled = init?.autoBackupEnabled ?? true;
    this.backupRetentionDays = init?.backupRetentionDays || 30;
    this.backupTime = init?.backupTime || '02:00';
  }
}

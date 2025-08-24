export enum AlertTypeDashboard {
  Info = 'Info',
  Warning = 'Warning',
  Critical = 'Critical'
}

// Classe représentant une alerte
export class DashboardAlert {
  type: AlertTypeDashboard;
  message: string;
  triggeredAt: Date;
  isResolved: boolean;

  constructor(
    type: AlertTypeDashboard = AlertTypeDashboard.Info,
    message: string = '',
    triggeredAt: Date = new Date(),
    isResolved: boolean = false
  ) {
    this.type = type;
    this.message = message;
    this.triggeredAt = triggeredAt;
    this.isResolved = isResolved;
  }
}

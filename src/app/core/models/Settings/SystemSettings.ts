// ==============================================
// PARAMÈTRES SYSTÈME
// ==============================================

import { GeneralSettings } from "./GeneralSettings";
import { IntegrationSettings } from "./IntegrationSettings";
import { MaintenanceSettings } from "./MaintenanceSettings";
import { NotificationSettings } from "./NotificationSettings";
import { SecuritySettings } from "./SecuritySettings";

export class SystemSettings {
  general: GeneralSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  integrations: IntegrationSettings;
  maintenance: MaintenanceSettings;

  constructor(init?: Partial<SystemSettings>) {
    this.general = new GeneralSettings(init?.general);
    this.notifications = new NotificationSettings(init?.notifications);
    this.security = new SecuritySettings(init?.security);
    this.integrations = new IntegrationSettings(init?.integrations);
    this.maintenance = new MaintenanceSettings(init?.maintenance);
  }
}

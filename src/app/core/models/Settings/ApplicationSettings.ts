import { PricingSettings } from "./PricingSettings";
import { ScheduleSettings } from "./ScheduleSettings";
import { ServiceSetting } from "./ServiceSetting";
import { SystemSettings } from "./SystemSettings";
import { VehicleTypeSetting } from "./VehicleTypeSetting";

export class ApplicationSettings {
  id?: string;
  centreId: string;
  schedule: ScheduleSettings;
  customServices: ServiceSetting[];
  vehicleTypes: VehicleTypeSetting[];
  pricing: PricingSettings;
  system: SystemSettings;
  createdAt: Date;
  lastModifiedAt: Date;
  modifiedBy?: string;
  version: number;

  constructor(init?: Partial<ApplicationSettings>) {
    this.id = init?.id;
    this.centreId = init?.centreId || '';
    this.schedule = new ScheduleSettings(init?.schedule);
    this.customServices = init?.customServices?.map(s => new ServiceSetting(s)) || [];
    this.vehicleTypes = init?.vehicleTypes?.map(v => new VehicleTypeSetting(v)) || [];
    this.pricing = new PricingSettings(init?.pricing);
    this.system = new SystemSettings(init?.system);
    this.createdAt = init?.createdAt || new Date();
    this.lastModifiedAt = init?.lastModifiedAt || new Date();
    this.modifiedBy = init?.modifiedBy;
    this.version = init?.version || 1;
  }
}

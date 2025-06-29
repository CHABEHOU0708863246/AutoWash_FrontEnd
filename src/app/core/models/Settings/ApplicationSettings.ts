import { ScheduleSettings } from "./ScheduleSettings";
import { ServiceSetting } from "./ServiceSetting";
import { VehicleTypeConfiguration } from "./VehicleTypeConfiguration";
import { ServicePricing } from "./ServicePricing";
import { PricingSettings } from "./PricingSettings";
import { SystemSettings } from "./SystemSettings";

export class ApplicationSettings {
  id?: string;
  centreId: string;

  // ===== HORAIRES D'OUVERTURE =====
  schedule: ScheduleSettings;

  // ===== PRESTATIONS DE SERVICE =====
  customServices: ServiceSetting[];

  // ===== TYPES DE VÉHICULES =====
  // IMPORTANT: Cette propriété doit correspondre exactement au backend C#
  vehicleTypeConfigurations: VehicleTypeConfiguration[];

  // ===== PRIX PAR TYPE DE SERVICE =====
  pricings: ServicePricing[];

  // ===== TARIFICATION GÉNÉRALE =====
  pricing: PricingSettings;

  // ===== PARAMÈTRES SYSTÈME =====
  system: SystemSettings;

  // ===== MÉTADONNÉES =====
  createdAt: Date;
  lastModifiedAt: Date;
  modifiedBy?: string;
  version: number;

  constructor(init?: Partial<ApplicationSettings>) {
    this.id = init?.id;
    this.centreId = init?.centreId || '';

    this.schedule = new ScheduleSettings(init?.schedule);
    this.customServices = init?.customServices?.map(s => new ServiceSetting(s)) || [];

    // CORRECTION: S'assurer que la propriété est bien nommée et mappée correctement
    this.vehicleTypeConfigurations = init?.vehicleTypeConfigurations?.map(v => new VehicleTypeConfiguration(v)) || [];

    this.pricings = init?.pricings?.map(p => new ServicePricing(p)) || [];
    this.pricing = new PricingSettings(init?.pricing);
    this.system = new SystemSettings(init?.system);

    this.createdAt = init?.createdAt || new Date();
    this.lastModifiedAt = init?.lastModifiedAt || new Date();
    this.modifiedBy = init?.modifiedBy;
    this.version = init?.version || 1;
  }

  // Méthode utilitaire pour vérifier la cohérence des données avant envoi
  toJSON(): any {
    return {
      id: this.id,
      centreId: this.centreId,
      schedule: this.schedule,
      customServices: this.customServices,
      vehicleTypeConfigurations: this.vehicleTypeConfigurations,
      pricings: this.pricings,
      pricing: this.pricing,
      system: this.system,
      createdAt: this.createdAt,
      lastModifiedAt: this.lastModifiedAt,
      modifiedBy: this.modifiedBy,
      version: this.version
    };
  }
}

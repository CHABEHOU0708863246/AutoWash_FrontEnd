import { VehicleType } from "../Vehicles/VehicleType";


export class VehicleTypeConfiguration {
  // Référence vers VehicleType (correspond au backend C#)
  vehicleTypeId: string;

  // Configuration spécifique au centre
  isActive: boolean;
  sizeMultiplier: number;
  sortOrder: number;

  // Surcharge optionnelle de l'icône pour ce centre
  customIconUrl?: string;

  // Métadonnées
  configuredAt: Date;
  configuredBy?: string;

  // Propriété calculée (ne pas envoyer au backend)
  vehicleType?: VehicleType;

  constructor(init?: Partial<VehicleTypeConfiguration>) {
    this.vehicleTypeId = init?.vehicleTypeId || '';
    this.isActive = init?.isActive ?? true;
    this.sizeMultiplier = init?.sizeMultiplier ?? 1.0;
    this.sortOrder = init?.sortOrder ?? 0;
    this.customIconUrl = init?.customIconUrl;
    this.configuredAt = init?.configuredAt || new Date();
    this.configuredBy = init?.configuredBy;

    // Ne pas inclure vehicleType dans la sérialisation vers le backend
    if (init?.vehicleType) {
      this.vehicleType = init.vehicleType;
    }
  }

  // Méthode pour sérialiser vers le backend (exclut vehicleType)
  toJSON(): any {
    return {
      vehicleTypeId: this.vehicleTypeId,
      isActive: this.isActive,
      sizeMultiplier: this.sizeMultiplier,
      sortOrder: this.sortOrder,
      customIconUrl: this.customIconUrl,
      configuredAt: this.configuredAt,
      configuredBy: this.configuredBy
    };
  }
}

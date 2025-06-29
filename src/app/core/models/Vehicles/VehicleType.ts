
export class VehicleType {
  id: string;
  label: string;
  description?: string;
  size: VehicleSize;
  iconUrl?: string;

  // Propriétés de configuration par défaut
  defaultSizeMultiplier: number;
  defaultSortOrder: number;

  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
  isGlobalType: boolean;
  isActive?: boolean;

  constructor(init?: Partial<VehicleType>) {
    // Générer un ID unique seulement si aucun ID n'est fourni
    this.id = init?.id || this.generateId();
    this.label = init?.label || '';
    this.description = init?.description;
    this.size = init?.size ?? VehicleSize.Medium;
    this.iconUrl = init?.iconUrl;

    this.defaultSizeMultiplier = init?.defaultSizeMultiplier ?? 1.0;
    this.defaultSortOrder = init?.defaultSortOrder ?? 0;

    this.createdAt = init?.createdAt || new Date();
    this.updatedAt = init?.updatedAt || new Date();
    this.isGlobalType = init?.isGlobalType ?? true;
    this.isActive = init?.isActive ?? true;
  }

  // Méthode privée pour générer un ID unique temporaire
  private generateId(): string {
    return 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

export enum VehicleSize {
  Small = 0,   // Moto, scooter
  Medium = 1,  // Voiture standard
  Large = 2,   // SUV, 4x4
  XLarge = 3   // Bus, camion
}


// ==============================================
// TYPES DE VÉHICULES
// ==============================================

export class VehicleTypeSetting {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  size: VehicleSize;
  sizeMultiplier: number;
  sortOrder: number;
  iconUrl?: string;

  constructor(init?: Partial<VehicleTypeSetting>) {
    this.id = init?.id || this.generateGuid();
    this.name = init?.name || '';
    this.description = init?.description || '';
    this.isActive = init?.isActive ?? true;
    this.size = init?.size || VehicleSize.Medium;
    this.sizeMultiplier = init?.sizeMultiplier || 1.0;
    this.sortOrder = init?.sortOrder || 0;
    this.iconUrl = init?.iconUrl;
  }

  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export enum VehicleSize {
  Small = 'Small',
  Medium = 'Medium',
  Large = 'Large',
  XLarge = 'XLarge'
}

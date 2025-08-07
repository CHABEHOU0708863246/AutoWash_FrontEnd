import { ServiceMaterial } from "./ServiceMaterial";
import { ServiceSettings } from "./ServiceSettings";

export class ServiceTemplate {
  id?: string;
  name: string = '';
  category: string = '';
  description?: string;
  defaultDuration: number = 30;
  defaultPrice: number = 0;
  defaultIncludedServices: string[] = [];
  defaultMaterials: ServiceMaterial[] = [];
  isActive: boolean = true;
  isGlobal: boolean = true; // Disponible pour tous les centres
  createdAt: Date = new Date();
  createdBy?: string;

  constructor(init?: Partial<ServiceTemplate>) {
    Object.assign(this, init);
  }

  createService(centreId: string): ServiceSettings {
    return new ServiceSettings({
      centreId: centreId,
      name: this.name,
      category: this.category,
      description: this.description,
      duration: this.defaultDuration,
      basePrice: this.defaultPrice,
      includedServices: [...this.defaultIncludedServices],
      requiredMaterials: this.defaultMaterials.map(m => new ServiceMaterial({
        materialId: m.materialId,
        materialName: m.materialName,
        quantity: m.quantity,
        isOptional: m.isOptional,
        notes: m.notes
      }))
    });
  }
}

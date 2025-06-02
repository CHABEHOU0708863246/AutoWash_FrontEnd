export class ServiceSetting {
  id?: string;
  name: string;
  description: string;
  isActive: boolean;
  estimatedDurationMinutes: number;
  includedServices: string[];
  category: ServiceCategory;
  sortOrder: number;
  iconUrl?: string;
  requiresApproval: boolean;

  constructor(init?: Partial<ServiceSetting>) {
    this.name = init?.name || '';
    this.description = init?.description || '';
    this.isActive = init?.isActive ?? true;
    this.estimatedDurationMinutes = init?.estimatedDurationMinutes || 30;
    this.includedServices = init?.includedServices || [];
    this.category = init?.category || ServiceCategory.Basic;
    this.sortOrder = init?.sortOrder || 0;
    this.iconUrl = init?.iconUrl || '';
    this.requiresApproval = init?.requiresApproval || false;

    // Seulement assigner l'ID s'il est fourni
    if (init?.id) {
      this.id = init.id;
    }
  }
}

export enum ServiceCategory {
  Basic = 0,
  Premium = 1,
  Interior = 2,
  Exterior = 3,
  Special = 4,
  Maintenance = 5
}

import { VehicleSize } from "./VehicleSize";
import { VehicleValidationRule } from "./VehicleValidationRule";


export class VehicleTypeSettings {
  id?: string;
  centreId: string = '';
  label: string = '';
  description?: string;
  size: VehicleSize = VehicleSize.Medium;
  defaultSizeMultiplier: number = 1.0;
  iconUrl?: string;
  isActive: boolean = true;
  defaultSortOrder: number = 0;
  minPrice?: number;
  maxPrice?: number;
  hasCustomPricing: boolean = false;
  serviceMultipliers: Record<string, number> = {};
  estimatedDurationMinutes: number = 30;
  extraDurationMinutes: number = 0;
  requiresSpecialEquipment: boolean = false;
  requiredEquipment: string[] = [];
  isAvailableOnline: boolean = true;
  isAvailableInStore: boolean = true;
  requiresApproval: boolean = false;
  maxReservationsPerDay: number = 0;
  totalWashes: number = 0;
  totalRevenue: number = 0;
  averageServiceTime: number = 0;
  lastUsedDate?: Date;
  validationRule?: VehicleValidationRule;
  customProperties: Record<string, string> = {};
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
  updatedBy?: string;
  isDeleted: boolean = false;
  deletedAt?: Date;
  deletedBy?: string;

  constructor(init?: Partial<VehicleTypeSettings>) {
    Object.assign(this, init);
  }

  getMultiplierForService(serviceId: string): number {
    return this.serviceMultipliers[serviceId] ?? this.defaultSizeMultiplier;
  }

  isValidForBooking(bookingDate: Date): boolean {
    if (!this.isActive) return false;
    if (this.isDeleted) return false;

    if (this.validationRule?.isDateRestricted) {
      const dayOfWeek = bookingDate.getDay();
      if (this.validationRule.restrictedDays?.includes(dayOfWeek)) {
        return false;
      }
    }

    return true;
  }

  updateUsageStats(serviceDurationMinutes: number, revenue: number): void {
    this.totalWashes++;
    this.totalRevenue += revenue;

    if (this.averageServiceTime === 0) {
      this.averageServiceTime = serviceDurationMinutes;
    } else {
      this.averageServiceTime = (this.averageServiceTime * (this.totalWashes - 1) + serviceDurationMinutes) / this.totalWashes;
    }

    this.lastUsedDate = new Date();
    this.updatedAt = new Date();
  }

  softDelete(deletedBy: string): void {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    this.isActive = false;
    this.updatedAt = new Date();
  }
}



export class VehicleTypeHistory {
  id?: string;
  centreId: string = '';
  vehicleTypeId: string = '';
  action: string = ''; // "Created", "Updated", "Deleted", "Activated", "Deactivated"
  oldValues?: string; // JSON des anciennes valeurs
  newValues?: string; // JSON des nouvelles valeurs
  modifiedBy: string = '';
  modifiedAt: Date = new Date();
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  additionalDetails?: string;

  constructor(init?: Partial<VehicleTypeHistory>) {
    Object.assign(this, init);
  }
}

export class VehicleTypeTemplate {
  id?: string;
  name: string = '';
  label: string = '';
  description?: string;
  size: VehicleSize = VehicleSize.Medium;
  defaultSizeMultiplier: number = 1.0;
  iconUrl?: string;
  estimatedDurationMinutes: number = 30;
  defaultRequiredEquipment: string[] = [];
  isGlobal: boolean = true; // Disponible pour tous les centres
  isActive: boolean = true;
  createdAt: Date = new Date();
  createdBy?: string;

  constructor(init?: Partial<VehicleTypeTemplate>) {
    Object.assign(this, init);
  }

  createVehicleType(centreId: string): VehicleTypeSettings {
    return new VehicleTypeSettings({
      centreId: centreId,
      label: this.label,
      description: this.description,
      size: this.size,
      defaultSizeMultiplier: this.defaultSizeMultiplier,
      iconUrl: this.iconUrl,
      estimatedDurationMinutes: this.estimatedDurationMinutes,
      requiredEquipment: [...this.defaultRequiredEquipment]
    });
  }
}



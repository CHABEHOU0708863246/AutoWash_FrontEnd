import { VehicleSize } from "../VehicleSize";


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

export class VehicleValidationRule {
  isDateRestricted: boolean = false;
  restrictedDays?: DayOfWeek[];
  earliestBookingTime?: string; // Format "HH:mm:ss"
  latestBookingTime?: string; // Format "HH:mm:ss"
  minAdvanceBookingHours?: number;
  maxAdvanceBookingDays?: number;
  requiresPhoneVerification: boolean = false;
  requiresIdVerification: boolean = false;
  minCustomerAge?: number;
  specialInstructions?: string;

  constructor(init?: Partial<VehicleValidationRule>) {
    Object.assign(this, init);
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

export class VehicleTypeStatistics {
  id?: string;
  centreId: string = '';
  vehicleTypeId: string = '';
  statDate: Date = new Date();
  dailyWashes: number = 0;
  dailyRevenue: number = 0;
  weeklyWashes: number = 0;
  weeklyRevenue: number = 0;
  monthlyWashes: number = 0;
  monthlyRevenue: number = 0;
  averageServiceTime: number = 0;
  averageWaitTime: number = 0;
  cancellationCount: number = 0;
  cancellationRate: number = 0;
  createdAt: Date = new Date();
  updatedAt: Date = new Date();

  constructor(init?: Partial<VehicleTypeStatistics>) {
    Object.assign(this, init);
  }
}

export class VehicleCategories {
  static readonly VOITURE = "Voiture";
  static readonly MOTO = "Moto";
  static readonly SUV = "SUV";
  static readonly CAMION = "Camion";
  static readonly BUS = "Bus";
  static readonly UTILITAIRE = "Utilitaire";
  static readonly SPORT = "Sport";
  static readonly LUXE = "Luxe";

  static getAll(): string[] {
    return [
      VehicleCategories.VOITURE,
      VehicleCategories.MOTO,
      VehicleCategories.SUV,
      VehicleCategories.CAMION,
      VehicleCategories.BUS,
      VehicleCategories.UTILITAIRE,
      VehicleCategories.SPORT,
      VehicleCategories.LUXE
    ];
  }
}

export class DefaultVehicleTypes {
  static getDefaultTypes(centreId: string): VehicleTypeSettings[] {
    return [
      new VehicleTypeSettings({
        centreId: centreId,
        label: "Voiture compacte",
        description: "Petites voitures, citadines",
        size: VehicleSize.Small,
        defaultSizeMultiplier: 0.8,
        iconUrl: "fas fa-car",
        estimatedDurationMinutes: 25,
        defaultSortOrder: 1
      }),
      new VehicleTypeSettings({
        centreId: centreId,
        label: "Voiture normale",
        description: "Berlines, breaks standards",
        size: VehicleSize.Medium,
        defaultSizeMultiplier: 1.0,
        iconUrl: "fas fa-car",
        estimatedDurationMinutes: 30,
        defaultSortOrder: 2
      }),
      new VehicleTypeSettings({
        centreId: centreId,
        label: "SUV/4x4",
        description: "SUV, 4x4, véhicules hauts",
        size: VehicleSize.Large,
        defaultSizeMultiplier: 1.3,
        iconUrl: "fas fa-car-side",
        estimatedDurationMinutes: 40,
        defaultSortOrder: 3
      }),
      new VehicleTypeSettings({
        centreId: centreId,
        label: "Camion/Utilitaire",
        description: "Camions, fourgons, utilitaires",
        size: VehicleSize.XLarge,
        defaultSizeMultiplier: 1.8,
        iconUrl: "fas fa-truck",
        estimatedDurationMinutes: 60,
        requiresSpecialEquipment: true,
        requiredEquipment: ["Échelle", "Nettoyeur haute pression"],
        defaultSortOrder: 4
      }),
      new VehicleTypeSettings({
        centreId: centreId,
        label: "Moto",
        description: "Motos, scooters",
        size: VehicleSize.Small,
        defaultSizeMultiplier: 0.5,
        iconUrl: "fas fa-motorcycle",
        estimatedDurationMinutes: 15,
        defaultSortOrder: 5
      })
    ];
  }
}

export enum DayOfWeek {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6
}

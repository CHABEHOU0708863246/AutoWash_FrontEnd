export class SettingsService {
  id?: string;
  centreId: string = '';
  name: string = '';
  category: string = '';
  description?: string;
  duration: number = 30; // en minutes
  sortOrder: number = 0;
  isActive: boolean = true;
  requiresApproval: boolean = false;
  includedServices: string[] = [];
  basePrice: number = 0;
  pricingRules?: string; // JSON pour règles de tarification spécifiques
  requiredSkills: string[] = [];
  requiredMaterials: ServiceMaterial[] = [];
  isAvailableOnline: boolean = true;
  isAvailableInStore: boolean = true;
  availableDays: DayOfWeek[] = [
    DayOfWeek.Monday,
    DayOfWeek.Tuesday,
    DayOfWeek.Wednesday,
    DayOfWeek.Thursday,
    DayOfWeek.Friday,
    DayOfWeek.Saturday,
    DayOfWeek.Sunday
  ];
  earliestStartTime?: string; // Format "HH:mm:ss"
  latestStartTime?: string; // Format "HH:mm:ss"
  maxReservationsPerDay: number = 0; // 0 = illimité
  maxReservationsPerSlot: number = 1;
  minAdvanceBookingHours: number = 0;
  maxAdvanceBookingDays: number = 30;
  cancellationDeadlineHours: number = 24;
  cancellationPenaltyPercentage: number = 0;
  totalBookings: number = 0;
  completedBookings: number = 0;
  cancelledBookings: number = 0;
  averageRating: number = 0;
  totalRatings: number = 0;
  customFields: Record<string, string> = {};
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
  updatedBy?: string;
  lastBookingDate?: Date;

  constructor(init?: Partial<SettingsService>) {
    Object.assign(this, init);
  }

  getSuccessRate(): number {
    if (this.totalBookings === 0) return 0;
    return (this.completedBookings / this.totalBookings) * 100;
  }

  isAvailableAt(dateTime: Date): boolean {
    if (!this.isActive) return false;

    const dayOfWeek = dateTime.getDay();
    if (!this.availableDays.includes(dayOfWeek)) return false;

    const timeOfDay = `${dateTime.getHours().toString().padStart(2, '0')}:${dateTime.getMinutes().toString().padStart(2, '0')}:${dateTime.getSeconds().toString().padStart(2, '0')}`;

    if (this.earliestStartTime && timeOfDay < this.earliestStartTime) return false;
    if (this.latestStartTime && timeOfDay > this.latestStartTime) return false;

    return true;
  }
}

export class ServiceMaterial {
  materialId: string = '';
  materialName: string = '';
  quantity: number = 1;
  isOptional: boolean = false;
  notes?: string;

  constructor(init?: Partial<ServiceMaterial>) {
    Object.assign(this, init);
  }
}

export class ServiceCategories {
  static readonly LAVAGE_EXTERIEUR = "Lavage extérieur";
  static readonly LAVAGE_INTERIEUR = "Lavage intérieur";
  static readonly LAVAGE_COMPLET = "Lavage complet";
  static readonly DETAILING = "Détailing";
  static readonly PROTECTION = "Protection";
  static readonly REPARATION = "Réparation";
  static readonly MAINTENANCE = "Maintenance";
  static readonly PERSONNALISE = "Personnalisé";

  static getAll(): string[] {
    return [
      ServiceCategories.LAVAGE_EXTERIEUR,
      ServiceCategories.LAVAGE_INTERIEUR,
      ServiceCategories.LAVAGE_COMPLET,
      ServiceCategories.DETAILING,
      ServiceCategories.PROTECTION,
      ServiceCategories.REPARATION,
      ServiceCategories.MAINTENANCE,
      ServiceCategories.PERSONNALISE
    ];
  }
}

export class BaseServices {
  static readonly LAVAGE_CARROSSERIE = "Lavage carrosserie";
  static readonly RINÇAGE = "Rinçage";
  static readonly SECHAGE = "Séchage";
  static readonly ASPIRATEUR = "Aspirateur";
  static readonly NETTOYAGE_SIEGES = "Nettoyage sièges";
  static readonly NETTOYAGE_TABLEAU_BORD = "Nettoyage tableau de bord";
  static readonly NETTOYAGE_VITRES = "Nettoyage vitres";
  static readonly CIRAGE = "Cirage";
  static readonly LUSTRAGE = "Lustrage";
  static readonly NETTOYAGE_JANTES = "Nettoyage jantes";
  static readonly NETTOYAGE_PNEUS = "Nettoyage pneus";
  static readonly DESODORISANT = "Désodorisant";

  static getAll(): string[] {
    return [
      BaseServices.LAVAGE_CARROSSERIE,
      BaseServices.RINÇAGE,
      BaseServices.SECHAGE,
      BaseServices.ASPIRATEUR,
      BaseServices.NETTOYAGE_SIEGES,
      BaseServices.NETTOYAGE_TABLEAU_BORD,
      BaseServices.NETTOYAGE_VITRES,
      BaseServices.CIRAGE,
      BaseServices.LUSTRAGE,
      BaseServices.NETTOYAGE_JANTES,
      BaseServices.NETTOYAGE_PNEUS,
      BaseServices.DESODORISANT
    ];
  }
}

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

  createService(centreId: string): SettingsService {
    return new SettingsService({
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

export enum DayOfWeek {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6
}

export class Customer {
  id?: string;
  phone: string = '';
  name?: string;
  email?: string;
  createdAt: Date = new Date();
  lastVisit?: Date;
  totalCompletedBookings: number = 0;
  totalAmountSpent: number = 0;
  isActive: boolean = true;
  vehiclePlates: string[] = [];

  constructor(init?: Partial<Customer>) {
    Object.assign(this, init);

    // Assure que createdAt est bien un objet Date
    if (init?.createdAt) {
      this.createdAt = new Date(init.createdAt);
    }

    // Assure que lastVisit est bien un objet Date si défini
    if (init?.lastVisit) {
      this.lastVisit = new Date(init.lastVisit);
    }
  }

  getFullName(): string {
    return this.name || 'Client sans nom';
  }

  addVehiclePlate(plate: string): void {
    if (!this.vehiclePlates.includes(plate)) {
      this.vehiclePlates.push(plate);
    }
  }

  removeVehiclePlate(plate: string): void {
    this.vehiclePlates = this.vehiclePlates.filter(p => p !== plate);
  }

  updateLastVisit(): void {
    this.lastVisit = new Date();
  }

  incrementBookings(): void {
    this.totalCompletedBookings++;
  }

  addToTotalSpent(amount: number): void {
    this.totalAmountSpent += amount;
  }

  deactivate(): void {
    this.isActive = false;
  }

  activate(): void {
    this.isActive = true;
  }

  getLoyaltyLevel(): string {
    if (this.totalCompletedBookings >= 50) {
      return 'Or';
    } else if (this.totalCompletedBookings >= 20) {
      return 'Argent';
    } else if (this.totalCompletedBookings >= 10) {
      return 'Bronze';
    }
    return 'Nouveau';
  }

  getAverageSpending(): number {
    return this.totalCompletedBookings > 0
      ? this.totalAmountSpent / this.totalCompletedBookings
      : 0;
  }
}

export class CustomerStatistics {
  static getLoyaltyThresholds(): Record<string, number> {
    return {
      'Nouveau': 0,
      'Bronze': 10,
      'Argent': 20,
      'Or': 50
    };
  }

  static calculatePotentialValue(customer: Customer): number {
    const average = customer.getAverageSpending();
    const remainingPotential = 100 - customer.totalCompletedBookings; // Supposant 100 lavages max
    return average * remainingPotential;
  }
}

export class CustomerCategories {
  static readonly REGULAR = "Client régulier";
  static readonly OCCASIONAL = "Client occasionnel";
  static readonly CORPORATE = "Client professionnel";
  static readonly VIP = "VIP";
  static readonly INACTIVE = "Inactif";

  static getAll(): string[] {
    return [
      CustomerCategories.REGULAR,
      CustomerCategories.OCCASIONAL,
      CustomerCategories.CORPORATE,
      CustomerCategories.VIP,
      CustomerCategories.INACTIVE
    ];
  }

  static getCategoryForCustomer(customer: Customer): string {
    if (!customer.isActive) return CustomerCategories.INACTIVE;
    if (customer.totalCompletedBookings >= 30) return CustomerCategories.VIP;
    if (customer.totalCompletedBookings >= 10) return CustomerCategories.REGULAR;
    if (customer.totalCompletedBookings > 0) return CustomerCategories.OCCASIONAL;
    return "Nouveau client";
  }
}

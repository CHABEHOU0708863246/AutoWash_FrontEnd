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

    // Conversion des dates
    if (init?.createdAt) {
      this.createdAt = new Date(init.createdAt);
    }
    if (init?.lastVisit) {
      this.lastVisit = new Date(init.lastVisit);
    }
  }

  // Méthodes utilitaires
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

  incrementBookings(amountSpent: number): void {
    this.totalCompletedBookings++;
    this.totalAmountSpent += amountSpent;
    this.updateLastVisit();
  }

  // Calcul du niveau de fidélité basé sur le nombre de réservations
  getLoyaltyLevel(): number {
    if (this.totalCompletedBookings >= 50) return 5;
    if (this.totalCompletedBookings >= 30) return 4;
    if (this.totalCompletedBookings >= 20) return 3;
    if (this.totalCompletedBookings >= 10) return 2;
    if (this.totalCompletedBookings >= 5) return 1;
    return 0;
  }

  isVipCustomer(): boolean {
    return this.getLoyaltyLevel() >= 4;
  }

  getAverageSpendingPerVisit(): number {
    if (this.totalCompletedBookings === 0) return 0;
    return this.totalAmountSpent / this.totalCompletedBookings;
  }
}

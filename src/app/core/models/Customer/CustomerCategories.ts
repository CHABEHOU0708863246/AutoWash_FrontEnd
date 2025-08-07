import { Customer } from "./Customer";

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

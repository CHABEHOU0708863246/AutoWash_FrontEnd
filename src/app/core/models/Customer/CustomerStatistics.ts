import { Customer } from "./Customer";

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
    const remainingPotential = 100 - customer.totalCompletedBookings;
    return average * remainingPotential;
  }
}

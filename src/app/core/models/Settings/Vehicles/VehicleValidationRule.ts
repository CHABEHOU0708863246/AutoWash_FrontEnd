import { DayOfWeek } from "../DayOfWeek";


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

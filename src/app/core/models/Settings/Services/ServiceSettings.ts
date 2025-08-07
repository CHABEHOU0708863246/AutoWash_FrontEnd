import { DayOfWeek } from "../DayOfWeek";
import { ServiceMaterial } from "./ServiceMaterial";


export class ServiceSettings {
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

  constructor(init?: Partial<ServiceSettings>) {
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










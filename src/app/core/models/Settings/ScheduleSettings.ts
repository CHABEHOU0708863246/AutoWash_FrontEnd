// ==============================================
// HORAIRES D'OUVERTURE
// ==============================================

import { DayOfWeek } from "./DayOfWeek";
import { DaySchedule } from "./DaySchedule";
import { SpecialSchedule } from "./SpecialSchedule";

export class ScheduleSettings {
  weeklySchedule: Map<DayOfWeek, DaySchedule>;
  specialDays: SpecialSchedule[];
  is24Hours: boolean;
  defaultOpenTime: string; // Format "HH:mm"
  defaultCloseTime: string; // Format "HH:mm"

  constructor(init?: Partial<ScheduleSettings>) {
    this.weeklySchedule = new Map<DayOfWeek, DaySchedule>();
    if (init?.weeklySchedule) {
      Object.entries(init.weeklySchedule).forEach(([key, value]) => {
        this.weeklySchedule.set(key as DayOfWeek, new DaySchedule(value));
      });
    } else {
      // Initialisation par défaut
      Object.values(DayOfWeek).forEach(day => {
        this.weeklySchedule.set(day, new DaySchedule());
      });
    }

    this.specialDays = init?.specialDays?.map(s => new SpecialSchedule(s)) || [];
    this.is24Hours = init?.is24Hours || false;
    this.defaultOpenTime = init?.defaultOpenTime || "07:00";
    this.defaultCloseTime = init?.defaultCloseTime || "19:00";
  }
}

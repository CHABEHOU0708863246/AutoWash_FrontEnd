import { BreakPeriod } from "./BreakPeriod";

export class DaySchedule {
  isOpen: boolean;
  openTime: string; // Format "HH:mm"
  closeTime: string; // Format "HH:mm"
  breaks: BreakPeriod[];

  constructor(init?: Partial<DaySchedule>) {
    this.isOpen = init?.isOpen ?? true;
    this.openTime = init?.openTime || "08:00";
    this.closeTime = init?.closeTime || "18:00";
    this.breaks = init?.breaks?.map(b => new BreakPeriod(b)) || [];
  }
}

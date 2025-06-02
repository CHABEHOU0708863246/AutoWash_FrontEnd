export class BreakPeriod {
  startTime: string; // Format "HH:mm"
  endTime: string; // Format "HH:mm"
  description: string;

  constructor(init?: Partial<BreakPeriod>) {
    this.startTime = init?.startTime || "12:00";
    this.endTime = init?.endTime || "13:00";
    this.description = init?.description || "Pause déjeuner";
  }
}

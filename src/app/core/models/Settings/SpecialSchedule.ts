export class SpecialSchedule {
  date: Date;
  isClosed: boolean;
  specialOpenTime?: string; // Format "HH:mm"
  specialCloseTime?: string; // Format "HH:mm"
  reason: string;

  constructor(init?: Partial<SpecialSchedule>) {
    this.date = init?.date || new Date();
    this.isClosed = init?.isClosed || false;
    this.specialOpenTime = init?.specialOpenTime;
    this.specialCloseTime = init?.specialCloseTime;
    this.reason = init?.reason || "Jour férié";
  }
}

export class TimeSlot {
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  description: string;

  constructor(init?: Partial<TimeSlot>) {
    this.startTime = init?.startTime || new Date();
    this.endTime = init?.endTime || new Date();
    this.isAvailable = init?.isAvailable ?? true;
    this.description = init?.description || "Créneau disponible";
  }
}

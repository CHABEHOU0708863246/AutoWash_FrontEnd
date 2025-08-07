import { DayOfWeek } from "../DayOfWeek";


export class ScheduleSettings {
  id?: string;
  centreId: string;
  openingTime: string; // Format "HH:mm:ss"
  closingTime: string; // Format "HH:mm:ss"
  workingDays: DayOfWeek[];
  maxConcurrentWashes: number;
  defaultWashDurationMinutes: number;
  breakBetweenWashesMinutes: number;
  allowOvertimeWork: boolean;
  lunchBreakStart?: string; // Format "HH:mm:ss"
  lunchBreakEnd?: string; // Format "HH:mm:ss"
  isWeekendWorkAllowed: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;

  constructor(
    centreId: string = '',
    openingTime: string = '08:00:00',
    closingTime: string = '18:00:00',
    workingDays: DayOfWeek[] = [
      DayOfWeek.Monday,
      DayOfWeek.Tuesday,
      DayOfWeek.Wednesday,
      DayOfWeek.Thursday,
      DayOfWeek.Friday,
      DayOfWeek.Saturday
    ],
    maxConcurrentWashes: number = 3,
    defaultWashDurationMinutes: number = 30,
    breakBetweenWashesMinutes: number = 5,
    allowOvertimeWork: boolean = true,
    isWeekendWorkAllowed: boolean = true,
    id?: string,
    lunchBreakStart?: string,
    lunchBreakEnd?: string,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
    updatedBy?: string
  ) {
    this.id = id;
    this.centreId = centreId;
    this.openingTime = openingTime;
    this.closingTime = closingTime;
    this.workingDays = workingDays;
    this.maxConcurrentWashes = maxConcurrentWashes;
    this.defaultWashDurationMinutes = defaultWashDurationMinutes;
    this.breakBetweenWashesMinutes = breakBetweenWashesMinutes;
    this.allowOvertimeWork = allowOvertimeWork;
    this.isWeekendWorkAllowed = isWeekendWorkAllowed;
    this.lunchBreakStart = lunchBreakStart;
    this.lunchBreakEnd = lunchBreakEnd;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.updatedBy = updatedBy;
  }
}



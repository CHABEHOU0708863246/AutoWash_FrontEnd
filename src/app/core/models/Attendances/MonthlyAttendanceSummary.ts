import { LeaveType } from "./LeaveType";

export class MonthlyAttendanceSummary {
  id?: string;
  userId: string;
  centreId: string;
  year: number;
  month: number;
  totalWorkingDays: number;
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  totalWorkedHours: string;
  totalLateTime: string;
  totalOverTime: string;
  leaveBreakdown: Map<LeaveType, number>;
  generatedAt: Date;

  constructor(
    userId: string = '',
    centreId: string = '',
    year: number = new Date().getFullYear(),
    month: number = new Date().getMonth() + 1
  ) {
    this.userId = userId;
    this.centreId = centreId;
    this.year = year;
    this.month = month;
    this.totalWorkingDays = 0;
    this.daysPresent = 0;
    this.daysAbsent = 0;
    this.daysLate = 0;
    this.totalWorkedHours = '00:00';
    this.totalLateTime = '00:00';
    this.totalOverTime = '00:00';
    this.leaveBreakdown = new Map<LeaveType, number>();
    this.generatedAt = new Date();
  }
}

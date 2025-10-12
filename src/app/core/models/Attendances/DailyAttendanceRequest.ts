import { AttendanceEntry } from "./AttendanceEntry";

export class DailyAttendanceRequest {
  centreId: string;
  date: Date;
  entries: AttendanceEntry[];
  recordedBy?: string;

  constructor(
    centreId: string = '',
    date: Date = new Date(),
    entries: AttendanceEntry[] = [],
    recordedBy: string = ''
  ) {
    this.centreId = centreId;
    this.date = date;
    this.entries = entries;
    this.recordedBy = recordedBy;
  }
}

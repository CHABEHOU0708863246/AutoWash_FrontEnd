import { AttendanceStatus } from "./AttendanceStatus";

export class AttendanceRecord {
  id?: string;
  userId: string;
  centreId: string;
  date: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  status: AttendanceStatus;
  workedHours?: string; // TimeSpan en string pour TypeScript
  lateArrival?: string;
  earlyDeparture?: string;
  overTime?: string;
  notes?: string;
  approvedBy?: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  createdAt: Date;
  modifiedAt?: Date;

  constructor(
    userId: string = '',
    centreId: string = '',
    date: Date = new Date(),
    scheduledStartTime: Date = new Date(),
    scheduledEndTime: Date = new Date(),
    status: AttendanceStatus = AttendanceStatus.Absent,
    id?: string
  ) {
    this.id = id;
    this.userId = userId;
    this.centreId = centreId;
    this.date = date;
    this.scheduledStartTime = scheduledStartTime;
    this.scheduledEndTime = scheduledEndTime;
    this.status = status;
    this.createdAt = new Date();
  }
}

import { AttendanceStatus } from "./AttendanceStatus";

export class AttendanceUpdateRequest {
  checkInTime?: Date;
  checkOutTime?: Date;
  status?: AttendanceStatus;
  notes?: string;
  approvedBy?: string;

  constructor(
    checkInTime?: Date,
    checkOutTime?: Date,
    status?: AttendanceStatus,
    notes: string = '',
    approvedBy: string = ''
  ) {
    this.checkInTime = checkInTime;
    this.checkOutTime = checkOutTime;
    this.status = status;
    this.notes = notes;
    this.approvedBy = approvedBy;
  }
}

export class AttendanceEntry {
  userId: string;
  isPresent: boolean;
  checkInTime?: Date;
  checkOutTime?: Date;
  notes?: string;

  constructor(
    userId: string = '',
    isPresent: boolean = false,
    checkInTime?: Date,
    checkOutTime?: Date,
    notes: string = ''
  ) {
    this.userId = userId;
    this.isPresent = isPresent;
    this.checkInTime = checkInTime;
    this.checkOutTime = checkOutTime;
    this.notes = notes;
  }
}

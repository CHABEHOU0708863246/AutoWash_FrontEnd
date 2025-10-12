export class WasherForAttendance {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  isSelected: boolean; // Pour les checkboxes

  constructor(
    id: string = '',
    firstName: string = '',
    lastName: string = '',
    email: string = '',
    phoneNumber: string = '',
    isSelected: boolean = false
  ) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.phoneNumber = phoneNumber;
    this.isSelected = isSelected;
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

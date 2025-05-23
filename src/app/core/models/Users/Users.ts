export class Users {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  isEnabled: boolean;
  roles: string[];
  workingHours: number;
  isPartTime: boolean;
  hireDate: Date;
  gender?: string;
  contractType?: string;
  numberOfChildren?: number;
  maritalStatus?: string;
  residence?: string;
  postalAddress?: string;
  centreId?: string;
  photoUrl?: string | File;
  password?: string
  confirmPassword?: string;

  constructor(
    id: string = '',
    firstName?: string,
    lastName?: string,
    email?: string,
    phoneNumber?: string,
    isEnabled: boolean = true,
    roles: string[] = [],
    workingHours: number = 0,
    isPartTime: boolean = false,
    hireDate: Date = new Date(),
    gender?: string,
    contractType?: string,
    numberOfChildren?: number,
    maritalStatus?: string,
    residence?: string,
    postalAddress?: string,
    centreId?: string,
    photoUrl?: string,
    password?: string,
    confirmPassword?: string
  ) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.phoneNumber = phoneNumber;
    this.isEnabled = isEnabled;
    this.roles = roles;
    this.workingHours = workingHours;
    this.isPartTime = isPartTime;
    this.hireDate = hireDate;
    this.gender = gender;
    this.contractType = contractType;
    this.numberOfChildren = numberOfChildren;
    this.maritalStatus = maritalStatus;
    this.residence = residence;
    this.postalAddress = postalAddress;
    this.centreId = centreId;
    this.photoUrl = photoUrl;
    this.password = password;
    this.confirmPassword = confirmPassword;
  }
}

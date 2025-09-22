export class UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  gender?: string;
  contractType?: string;
  numberOfChildren?: number;
  maritalStatus?: string;
  residence?: string;
  postalAddress?: string;
  centreId?: string;
  photoFile?: File;

  // Champs pour la modification du mot de passe
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;

  constructor(
    firstName?: string,
    lastName?: string,
    phoneNumber?: string,
    gender?: string,
    contractType?: string,
    numberOfChildren?: number,
    maritalStatus?: string,
    residence?: string,
    postalAddress?: string,
    centreId?: string,
    photoFile?: File,
    currentPassword?: string,
    newPassword?: string,
    confirmNewPassword?: string
  ) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.phoneNumber = phoneNumber;
    this.gender = gender;
    this.contractType = contractType;
    this.numberOfChildren = numberOfChildren;
    this.maritalStatus = maritalStatus;
    this.residence = residence;
    this.postalAddress = postalAddress;
    this.centreId = centreId;
    this.photoFile = photoFile;
    this.currentPassword = currentPassword;
    this.newPassword = newPassword;
    this.confirmNewPassword = confirmNewPassword;
  }
}

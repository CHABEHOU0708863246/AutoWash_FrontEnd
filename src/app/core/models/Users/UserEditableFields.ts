import { Users } from "./Users";

export class UserEditableFields {
  canEditFirstName: boolean = false;
  canEditLastName: boolean = false;
  canEditPhoneNumber: boolean = false;
  canEditGender: boolean = false;
  canEditContractType: boolean = false;
  canEditNumberOfChildren: boolean = false;
  canEditMaritalStatus: boolean = false;
  canEditResidence: boolean = false;
  canEditPostalAddress: boolean = false;
  canEditCentreId: boolean = false;
  canEditPhoto: boolean = false;
  canChangePassword: boolean = true; // Toujours autorisé

  // Valeurs actuelles pour l'affichage
  currentUser?: Users;

  constructor(
    canEditFirstName: boolean = false,
    canEditLastName: boolean = false,
    canEditPhoneNumber: boolean = false,
    canEditGender: boolean = false,
    canEditContractType: boolean = false,
    canEditNumberOfChildren: boolean = false,
    canEditMaritalStatus: boolean = false,
    canEditResidence: boolean = false,
    canEditPostalAddress: boolean = false,
    canEditCentreId: boolean = false,
    canEditPhoto: boolean = false,
    canChangePassword: boolean = true,
    currentUser?: Users
  ) {
    this.canEditFirstName = canEditFirstName;
    this.canEditLastName = canEditLastName;
    this.canEditPhoneNumber = canEditPhoneNumber;
    this.canEditGender = canEditGender;
    this.canEditContractType = canEditContractType;
    this.canEditNumberOfChildren = canEditNumberOfChildren;
    this.canEditMaritalStatus = canEditMaritalStatus;
    this.canEditResidence = canEditResidence;
    this.canEditPostalAddress = canEditPostalAddress;
    this.canEditCentreId = canEditCentreId;
    this.canEditPhoto = canEditPhoto;
    this.canChangePassword = canChangePassword;
    this.currentUser = currentUser;
  }
}

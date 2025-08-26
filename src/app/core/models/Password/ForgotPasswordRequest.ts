export class ForgotPasswordRequest {
  email: string;
  redirectPath: string;

  constructor(email: string = '', redirectPath: string = '') {
    this.email = email;
    this.redirectPath = redirectPath;
  }
}

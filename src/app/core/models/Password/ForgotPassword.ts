export class ForgotPassword {
  email: string;
  code: string;

  constructor(email: string = '', code: string = '') {
    this.email = email;
    this.code = code;
  }
}

export class ResetPasswordRequest {
  email: string;
  token: string;
  password: string;

  constructor(email: string = '', token: string = '', password: string = '') {
    this.email = email;
    this.token = token;
    this.password = password;
  }
}

export class Roles {
  id: string;
  roleName?: string;
  normalizedName: string;
  code?: string;
  isVisible: boolean;

  constructor(
    id: string = '',
    roleName?: string,
    normalizedName: string = '',
    code?: string,
    isVisible: boolean = true
  ) {
    this.id = id;
    this.roleName = roleName;
    this.normalizedName = normalizedName;
    this.code = code;
    this.isVisible = isVisible;
  }
}

export class Centres {
  id?: string;
  name: string;
  location: string;
  ownerId: string;
  ownerName: string;
  isActive: boolean;

  constructor(
    name: string = '',
    location: string = '',
    isActive: boolean = true,
    id?: string,
    ownerId: string = '',
    ownerName: string = ''
  ) {
    this.id = id;
    this.name = name;
    this.location = location;
    this.ownerId = ownerId;
    this.ownerName = ownerName;
    this.isActive = isActive;
  }
}

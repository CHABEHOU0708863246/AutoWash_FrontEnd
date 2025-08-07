export interface VehicleDetails {
  plate: string;
  type?: string;
  brand?: string;
  color?: string;
  firstSeen?: Date;
  lastSeen?: Date;
  washCount: number;
}

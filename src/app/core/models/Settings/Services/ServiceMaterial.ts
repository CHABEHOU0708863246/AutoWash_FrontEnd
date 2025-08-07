export class ServiceMaterial {
  materialId: string = '';
  materialName: string = '';
  quantity: number = 1;
  isOptional: boolean = false;
  notes?: string;

  constructor(init?: Partial<ServiceMaterial>) {
    Object.assign(this, init);
  }
}

export interface CreateOrUpdateCustomerRequest {
  phone: string;
  name: string;
  email?: string;
  vehicleType?: string;
  vehicleBrand?: string;
}

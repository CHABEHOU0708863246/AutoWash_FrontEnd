export interface CustomerResponse {
  id: string;
  phone: string;
  name: string;
  loyaltyLevel: number;
  totalAmountSpent: number;
  vehiclePlates: string[];
  isNewCustomer: boolean;
}

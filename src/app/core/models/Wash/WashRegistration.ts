import { PaymentMethod } from "../Payments/PaymentMethod";
import { CreateOrUpdateCustomerRequest } from "./CreateOrUpdateCustomerRequest";

export interface WashRegistration {
  centreId: string;
  serviceId: string;
  vehicleTypeId: string;
  customer: CreateOrUpdateCustomerRequest;
  vehiclePlate: string;
  vehicleBrand?: string;
  vehicleColor?: string;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  applyLoyaltyDiscount: boolean;
  discountCode?: string;
  performedByUserId: string;
  isAdminOverride: boolean;
}

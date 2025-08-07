import { Customer } from "./Customer/Customer";
import { CustomerInfo } from "./Customer/CustomerInfo";
import { WashRegistration } from "./Wash/WashRegistration";
import { WashSession } from "./Wash/WashSession";

export class ModelMapper {

  static mapBackendCustomerToFrontend(backendCustomer: any): Customer {
    return new Customer({
      id: backendCustomer.id,
      phone: backendCustomer.phone,
      name: backendCustomer.name,
      email: backendCustomer.email,
      createdAt: new Date(backendCustomer.createdAt),
      lastVisit: backendCustomer.lastVisit ? new Date(backendCustomer.lastVisit) : undefined,
      totalCompletedBookings: backendCustomer.totalCompletedBookings,
      totalAmountSpent: backendCustomer.totalAmountSpent,
      isActive: backendCustomer.isActive,
      vehiclePlates: backendCustomer.vehiclePlates || []
    });
  }

  static mapBackendWashSessionToFrontend(backendSession: any): WashSession {
    return new WashSession({
      ...backendSession,
      customer: new CustomerInfo({
        customerId: backendSession.customer?.customerId,
        phoneNumber: backendSession.customer?.phoneNumber,
        name: backendSession.customer?.name,
        email: backendSession.customer?.email,
        loyaltyPointsUsed: backendSession.customer?.loyaltyPointsUsed || 0,
        loyaltyDiscountApplied: backendSession.customer?.loyaltyDiscountApplied || 0
      })
    });
  }

  static mapFrontendWashRegistrationToBackend(registration: WashRegistration): any {
    return {
      centreId: registration.centreId,
      serviceId: registration.serviceId,
      vehicleTypeId: registration.vehicleTypeId,
      customer: {
        phone: registration.customer.phone,
        name: registration.customer.name,
        email: registration.customer.email
      },
      vehiclePlate: registration.vehiclePlate,
      vehicleBrand: registration.vehicleBrand,
      vehicleColor: registration.vehicleColor,
      amountPaid: registration.amountPaid,
      paymentMethod: registration.paymentMethod,
      transactionId: registration.transactionId,
      applyLoyaltyDiscount: registration.applyLoyaltyDiscount,
      discountCode: registration.discountCode,
      notes: registration.notes,
      performedByUserId: registration.performedByUserId,
      isAdminOverride: registration.isAdminOverride || false,
      requestDate: registration.requestDate || new Date()
    };
  }
}

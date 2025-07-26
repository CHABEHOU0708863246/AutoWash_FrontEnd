import { CustomerInfo } from "../Customer/CustomerInfo";
import { WashSession } from "./WashSession";

export class WashSessionBuilder {
  private session: Partial<WashSession> = {};

  withCentre(centreId: string): WashSessionBuilder {
    this.session.centreId = centreId;
    return this;
  }

  withService(serviceId: string): WashSessionBuilder {
    this.session.serviceId = serviceId;
    return this;
  }

  withVehicleType(vehicleTypeId: string): WashSessionBuilder {
    this.session.vehicleTypeId = vehicleTypeId;
    return this;
  }

  withCustomer(customer: CustomerInfo): WashSessionBuilder {
    this.session.customer = customer;
    return this;
  }

  withVehicle(plate: string, brand?: string, color?: string): WashSessionBuilder {
    this.session.vehiclePlate = plate;
    this.session.vehicleBrand = brand;
    this.session.vehicleColor = color;
    return this;
  }

  withScheduling(startTime: Date): WashSessionBuilder {
    this.session.scheduledStart = startTime;
    return this;
  }

  withPricing(price: number): WashSessionBuilder {
    this.session.price = price;
    return this;
  }

  build(): WashSession {
    return new WashSession(this.session);
  }
}

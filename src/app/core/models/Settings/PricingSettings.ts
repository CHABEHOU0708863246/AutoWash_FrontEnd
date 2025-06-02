// ==============================================
// TARIFICATION
// ==============================================

import { DiscountRule } from "./DiscountRule";
import { PricingConfiguration } from "./PricingConfiguration";
import { ServicePricing } from "./ServicePricing";
import { ZonePricing } from "./ZonePricing";

export class PricingSettings {
  servicePrices: Map<string, ServicePricing>;
  zonePricing: Map<string, ZonePricing>;
  discountRules: DiscountRule[];
  configuration: PricingConfiguration;

  constructor(init?: Partial<PricingSettings>) {
    this.servicePrices = new Map<string, ServicePricing>();
    if (init?.servicePrices) {
      Object.entries(init.servicePrices).forEach(([key, value]) => {
        this.servicePrices.set(key, new ServicePricing(value));
      });
    }

    this.zonePricing = new Map<string, ZonePricing>();
    if (init?.zonePricing) {
      Object.entries(init.zonePricing).forEach(([key, value]) => {
        this.zonePricing.set(key, new ZonePricing(value));
      });
    }

    this.discountRules = init?.discountRules?.map(d => new DiscountRule(d)) || [];
    this.configuration = new PricingConfiguration(init?.configuration);
  }
}

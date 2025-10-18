import { ProfitabilityAnalysis } from "./ProfitabilityAnalysis";
import { ProfitabilityStats } from "./ProfitabilityStats";

export class ProfitabilityResponse {
  succeeded: boolean = false;
  errors: string[] = [];

  // Statistiques globales
  globalStats: ProfitabilityStats = new ProfitabilityStats();

  // Détails par centre
  centreDetails: ProfitabilityAnalysis[] = [];

  constructor(init?: Partial<ProfitabilityResponse>) {
    Object.assign(this, init);

    if (init?.globalStats) {
      this.globalStats = new ProfitabilityStats(init.globalStats);
    }

    if (init?.centreDetails) {
      this.centreDetails = init.centreDetails.map(detail => new ProfitabilityAnalysis(detail));
    }
  }

  addError(error: string): void {
    this.errors.push(error);
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }
}

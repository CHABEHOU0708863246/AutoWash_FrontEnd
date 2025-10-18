export class ProfitabilityRequest {
  centreId?: string; // null = tous les centres
  startDate: Date = new Date();
  endDate: Date = new Date();

  constructor(init?: Partial<ProfitabilityRequest>) {
    // Par défaut, analyse mensuelle du mois en cours
    const now = new Date();
    this.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    this.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    Object.assign(this, init);

    // Conversion des dates
    if (init?.startDate) {
      this.startDate = new Date(init.startDate);
    }
    if (init?.endDate) {
      this.endDate = new Date(init.endDate);
    }
  }

  validate(): string[] {
    const errors: string[] = [];

    if (!this.startDate) {
      errors.push('La date de début est requise');
    }

    if (!this.endDate) {
      errors.push('La date de fin est requise');
    }

    if (this.startDate && this.endDate && this.startDate > this.endDate) {
      errors.push('La date de début ne peut pas être après la date de fin');
    }

    return errors;
  }

  // Méthode pour obtenir la période formatée
  getFormattedPeriod(): string {
    return `${this.startDate.toLocaleDateString('fr-FR')} - ${this.endDate.toLocaleDateString('fr-FR')}`;
  }
}

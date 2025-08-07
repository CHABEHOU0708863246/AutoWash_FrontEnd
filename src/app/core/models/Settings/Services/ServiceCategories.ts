export class ServiceCategories {
  static readonly LAVAGE_EXTERIEUR = "Lavage extérieur";
  static readonly LAVAGE_INTERIEUR = "Lavage intérieur";
  static readonly LAVAGE_COMPLET = "Lavage complet";
  static readonly DETAILING = "Détailing";
  static readonly PROTECTION = "Protection";
  static readonly REPARATION = "Réparation";
  static readonly MAINTENANCE = "Maintenance";
  static readonly PERSONNALISE = "Personnalisé";

  static getAll(): string[] {
    return [
      ServiceCategories.LAVAGE_EXTERIEUR,
      ServiceCategories.LAVAGE_INTERIEUR,
      ServiceCategories.LAVAGE_COMPLET,
      ServiceCategories.DETAILING,
      ServiceCategories.PROTECTION,
      ServiceCategories.REPARATION,
      ServiceCategories.MAINTENANCE,
      ServiceCategories.PERSONNALISE
    ];
  }
}

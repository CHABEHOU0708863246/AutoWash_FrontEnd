export class BaseServices {
  static readonly LAVAGE_CARROSSERIE = "Lavage carrosserie";
  static readonly RINÇAGE = "Rinçage";
  static readonly SECHAGE = "Séchage";
  static readonly ASPIRATEUR = "Aspirateur";
  static readonly NETTOYAGE_SIEGES = "Nettoyage sièges";
  static readonly NETTOYAGE_TABLEAU_BORD = "Nettoyage tableau de bord";
  static readonly NETTOYAGE_VITRES = "Nettoyage vitres";
  static readonly CIRAGE = "Cirage";
  static readonly LUSTRAGE = "Lustrage";
  static readonly NETTOYAGE_JANTES = "Nettoyage jantes";
  static readonly NETTOYAGE_PNEUS = "Nettoyage pneus";
  static readonly DESODORISANT = "Désodorisant";

  static getAll(): string[] {
    return [
      BaseServices.LAVAGE_CARROSSERIE,
      BaseServices.RINÇAGE,
      BaseServices.SECHAGE,
      BaseServices.ASPIRATEUR,
      BaseServices.NETTOYAGE_SIEGES,
      BaseServices.NETTOYAGE_TABLEAU_BORD,
      BaseServices.NETTOYAGE_VITRES,
      BaseServices.CIRAGE,
      BaseServices.LUSTRAGE,
      BaseServices.NETTOYAGE_JANTES,
      BaseServices.NETTOYAGE_PNEUS,
      BaseServices.DESODORISANT
    ];
  }
}

export class VehicleCategories {
  static readonly VOITURE = "Voiture";
  static readonly MOTO = "Moto";
  static readonly SUV = "SUV";
  static readonly CAMION = "Camion";
  static readonly BUS = "Bus";
  static readonly UTILITAIRE = "Utilitaire";
  static readonly SPORT = "Sport";
  static readonly LUXE = "Luxe";

  static getAll(): string[] {
    return [
      VehicleCategories.VOITURE,
      VehicleCategories.MOTO,
      VehicleCategories.SUV,
      VehicleCategories.CAMION,
      VehicleCategories.BUS,
      VehicleCategories.UTILITAIRE,
      VehicleCategories.SPORT,
      VehicleCategories.LUXE
    ];
  }
}

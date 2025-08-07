import { VehicleSize } from "./VehicleSize";
import { VehicleTypeSettings } from "./VehicleTypeSettings";




export class DefaultVehicleTypes {
  static getDefaultTypes(centreId: string): VehicleTypeSettings[] {
    return [
      new VehicleTypeSettings({
        centreId: centreId,
        label: "Voiture compacte",
        description: "Petites voitures, citadines",
        size: VehicleSize.Small,
        defaultSizeMultiplier: 0.8,
        iconUrl: "fas fa-car",
        estimatedDurationMinutes: 25,
        defaultSortOrder: 1
      }),
      new VehicleTypeSettings({
        centreId: centreId,
        label: "Voiture normale",
        description: "Berlines, breaks standards",
        size: VehicleSize.Medium,
        defaultSizeMultiplier: 1.0,
        iconUrl: "fas fa-car",
        estimatedDurationMinutes: 30,
        defaultSortOrder: 2
      }),
      new VehicleTypeSettings({
        centreId: centreId,
        label: "SUV/4x4",
        description: "SUV, 4x4, véhicules hauts",
        size: VehicleSize.Large,
        defaultSizeMultiplier: 1.3,
        iconUrl: "fas fa-car-side",
        estimatedDurationMinutes: 40,
        defaultSortOrder: 3
      }),
      new VehicleTypeSettings({
        centreId: centreId,
        label: "Camion/Utilitaire",
        description: "Camions, fourgons, utilitaires",
        size: VehicleSize.XLarge,
        defaultSizeMultiplier: 1.8,
        iconUrl: "fas fa-truck",
        estimatedDurationMinutes: 60,
        requiresSpecialEquipment: true,
        requiredEquipment: ["Échelle", "Nettoyeur haute pression"],
        defaultSortOrder: 4
      }),
      new VehicleTypeSettings({
        centreId: centreId,
        label: "Moto",
        description: "Motos, scooters",
        size: VehicleSize.Small,
        defaultSizeMultiplier: 0.5,
        iconUrl: "fas fa-motorcycle",
        estimatedDurationMinutes: 15,
        defaultSortOrder: 5
      })
    ];
  }
}

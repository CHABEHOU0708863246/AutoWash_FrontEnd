import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { SettingsService } from '../../../core/services/Settings/settings.service';
import { VehicleTypeSetting, VehicleSize } from '../../../core/models/Settings/VehicleTypeSetting';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings-vehicles',
  imports: [RouterLink, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './settings-vehicles.component.html',
  styleUrl: './settings-vehicles.component.scss'
})
export class SettingsVehiclesComponent implements OnInit {
  vehicleTypes: VehicleTypeSetting[] = [];
  filteredVehicleTypes: VehicleTypeSetting[] = [];
  selectedVehicleType: VehicleTypeSetting | null = null;
  searchQuery: string = '';
  isLoading: boolean = false;
  errorMessage: string | null = null;
  centreId: string = '682ff7a6f37eb58fa4edee74'; // Replace with actual centreId (e.g., from auth or route params)
  isEditMode: boolean = false;

  // Form fields for modal
  vehicleTypeForm: Partial<VehicleTypeSetting> = {
    name: '',
    description: '',
    size: VehicleSize.Medium,
    sizeMultiplier: 1.0,
    sortOrder: 0,
    isActive: true,
    iconUrl: ''
  };

  vehicleSizes = Object.values(VehicleSize).map(size => ({ value: size, label: size }));

  constructor(
    private router: Router,
    private settingsService: SettingsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadVehicleTypes();
  }

  loadVehicleTypes(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.settingsService.getVehicleTypes(this.centreId).subscribe({
      next: (vehicleTypes) => {
        this.vehicleTypes = vehicleTypes;
        this.filteredVehicleTypes = vehicleTypes;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors du chargement des types de véhicules';
        console.error(error);
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.filteredVehicleTypes = [...this.vehicleTypes];
      return;
    }
    const query = this.searchQuery.toLowerCase();
    this.filteredVehicleTypes = this.vehicleTypes.filter(vt =>
      vt.name.toLowerCase().includes(query) ||
      vt.description.toLowerCase().includes(query)
    );
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.vehicleTypeForm = {
      name: '',
      description: '',
      size: VehicleSize.Medium,
      sizeMultiplier: 1.0,
      sortOrder: 0,
      isActive: true,
      iconUrl: ''
    };
    this.selectedVehicleType = null;
    this.showModal('addVehicleTypeModal');
  }

  openEditModal(vehicleType: VehicleTypeSetting): void {
    this.isEditMode = true;
    this.selectedVehicleType = vehicleType;
    this.vehicleTypeForm = { ...vehicleType };
    this.showModal('addVehicleTypeModal');
  }

  saveVehicleType(): void {
    if (!this.validateForm()) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires correctement.';
      return;
    }

    this.isLoading = true;
    const vehicleType: VehicleTypeSetting = {
      ...this.vehicleTypeForm,
      id: this.isEditMode ? this.selectedVehicleType?.id : undefined
    } as VehicleTypeSetting;

    const observable = this.isEditMode && vehicleType.id
      ? this.settingsService.updateVehicleType(this.centreId, vehicleType.id, vehicleType)
      : this.settingsService.createVehicleType(this.centreId, vehicleType);

    observable.subscribe({
      next: (result) => {
        this.loadVehicleTypes();
        this.closeModal('addVehicleTypeModal');
        this.errorMessage = null;
      },
      error: (error) => {
        this.errorMessage = `Erreur lors de ${this.isEditMode ? 'la mise à jour' : 'la création'} du type de véhicule`;
        console.error(error);
        this.isLoading = false;
      }
    });
  }

  toggleVehicleTypeStatus(vehicleType: VehicleTypeSetting): void {
    if (!vehicleType.id) return;
    this.isLoading = true;
    this.settingsService.toggleVehicleTypeStatus(this.centreId, vehicleType.id).subscribe({
      next: (isActive) => {
        vehicleType.isActive = isActive;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors de la modification du statut';
        console.error(error);
        this.isLoading = false;
      }
    });
  }

  private validateForm(): boolean {
    const { name, size, sizeMultiplier, sortOrder } = this.vehicleTypeForm;
    return !!name && !!size && sizeMultiplier !== undefined && sizeMultiplier > 0 && sortOrder !== undefined && sortOrder >= 0;
  }

  private showModal(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      // Use MDB Bootstrap's modal API
      // @ts-ignore
      const modal = new mdb.Modal(modalElement);
      modal.show();
    }
  }

  private closeModal(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      // @ts-ignore
      const modal = mdb.Modal.getInstance(modalElement);
      modal?.hide();
    }
  }

  selectIcon(iconClass: string): void {
    this.vehicleTypeForm.iconUrl = iconClass;
    this.updateIconPreview(iconClass);
  }

  private updateIconPreview(iconClass: string): void {
    const previewElement = document.querySelector('.vehicle-icon-preview i');
    if (previewElement) {
      previewElement.className = iconClass;
    }
  }

  logout(): void {
    if (this.authService.isAuthenticated()) {
      try {
        console.log('État du localStorage avant déconnexion:', {
          token: !!this.authService.getToken(),
          userRole: localStorage.getItem('userRole'),
          profile: localStorage.getItem('currentUserProfile')
        });

        this.authService.logout();

        console.log('État du localStorage après déconnexion:', {
          token: !!this.authService.getToken(),
          userRole: localStorage.getItem('userRole'),
          profile: localStorage.getItem('currentUserProfile')
        });

        this.router.navigate(['/auth/login']);
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        this.router.navigate(['/auth/login']);
      }
    } else {
      this.router.navigate(['/auth/login']);
    }
  }
}

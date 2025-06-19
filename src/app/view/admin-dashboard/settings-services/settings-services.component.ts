import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormBuilder,
  Validators,
} from '@angular/forms';
import {
  ServiceCategory,
  ServiceSetting,
} from '../../../core/models/Settings/ServiceSetting';
import { SettingsService } from '../../../core/services/Settings/settings.service';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Centres } from '../../../core/models/Centres/Centres';
import { ConfirmDialogComponent } from '../../../core/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-settings-services',
  imports: [RouterLink, CommonModule, ReactiveFormsModule],
  templateUrl: './settings-services.component.html',
  styleUrl: './settings-services.component.scss',
})
export class SettingsServicesComponent implements OnInit {
  serviceForm: FormGroup;
  services: ServiceSetting[] = [];
  centres: Centres[] = [];
  availableServices: ServiceSetting[] = [];
  selectedService: ServiceSetting | null = null;
  isEditing = false;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

serviceCategories = [
  { value: ServiceCategory.Basic, label: 'Basique' },
  { value: ServiceCategory.Premium, label: 'Premium' },
  { value: ServiceCategory.Interior, label: 'Intérieur' },
  { value: ServiceCategory.Exterior, label: 'Extérieur' },
  { value: ServiceCategory.Special, label: 'Spécial' },
  { value: ServiceCategory.Maintenance, label: 'Maintenance' }
];

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private centreService: CentresService,
    private modalService: NgbModal,
    private router: Router,
    private authService: AuthService
  ) {
    this.serviceForm = this.fb.group({
      centreId: ['', Validators.required],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      category: [0, Validators.required],
      description: ['', Validators.maxLength(500)],
      duration: [30, [Validators.required, Validators.min(1)]],
      sortOrder: [0, [Validators.required, Validators.min(0)]],
      isActive: [true],
      requiresApproval: [false],
      includedServices: [[]],
    });
  }

  ngOnInit(): void {
    this.loadCentres();
  }

  loadCentres(): void {
    this.isLoading = true;
    this.centreService.getAllCentres().subscribe({
      next: (centres) => {
        this.centres = centres;
        this.isLoading = false;
        if (centres.length > 0 && centres[0].id) {
          this.serviceForm.patchValue({ centreId: centres[0].id });
          this.loadServices(centres[0].id);
        }
      },
      error: () => {
        this.showError('Erreur lors du chargement des centres');
        this.isLoading = false;
      },
    });
  }

  onCentreChange(): void {
    const centreId = this.serviceForm.get('centreId')?.value;
    if (centreId) {
      this.loadServices(centreId);
    }
  }

  loadServices(centreId: string): void {
    this.isLoading = true;
    this.settingsService.getServices(centreId).subscribe({
      next: (services) => {
        this.services = services;
        this.availableServices = services.filter(
          (s) => s.id !== this.selectedService?.id
        );
        this.isLoading = false;
      },
      error: () => {
        this.showError('Erreur lors du chargement des prestations');
        this.isLoading = false;
      },
    });
  }

  onSubmit(): void {
    if (this.serviceForm.invalid) {
      this.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formValue = this.serviceForm.value;
    const centreId = formValue.centreId;

    // Vérification plus stricte de centreId
    if (!centreId) {
      this.showError('Aucun centre sélectionné');
      this.isLoading = false;
      return;
    }

    const serviceData: ServiceSetting = {
      id: this.selectedService?.id || '',
      name: formValue.name || '',
      category: Number(formValue.category) as ServiceCategory || ServiceCategory.Basic,
      description: formValue.description || '',
      estimatedDurationMinutes: formValue.duration || 30,
      sortOrder: formValue.sortOrder || 0,
      isActive: formValue.isActive !== false,
      requiresApproval: formValue.requiresApproval === true,
      includedServices: this.getIncludedServices() || [],
      iconUrl: ''
    };

    // Gestion plus sécurisée de l'édition
    let observable;
    if (this.isEditing && this.selectedService?.id) {
      observable = this.settingsService.updateService(
        centreId,
        this.selectedService.id,
        serviceData
      );
    } else {
      observable = this.settingsService.createService(centreId, serviceData);
    }

    observable.subscribe({
      next: () => {
        this.showSuccess(
          `Prestation ${this.isEditing ? 'mise à jour' : 'créée'} avec succès`
        );
        this.resetForm();
        this.loadServices(centreId);
      },
      error: (err) => {
        this.showError(
          `Erreur lors de ${
            this.isEditing ? 'la mise à jour' : 'la création'
          } de la prestation`
        );
        console.error("Détails de l'erreur:", err);
        this.isLoading = false;
      },
    });
  }

  editService(service: ServiceSetting): void {
    this.selectedService = service;
    this.isEditing = true;

    this.serviceForm.patchValue({
      name: service.name,
      category: service.category,
      description: service.description,
      duration: service.estimatedDurationMinutes,
      sortOrder: service.sortOrder,
      isActive: service.isActive,
      requiresApproval: service.requiresApproval,
    });

    // Recharger les services disponibles (exclure le service en cours d'édition)
    this.availableServices = this.services.filter((s) => s.id !== service.id);

    // Scroll vers le formulaire
    document
      .getElementById('service-form')
      ?.scrollIntoView({ behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  toggleServiceStatus(service: ServiceSetting): void {
    const centreId = this.serviceForm.get('centreId')?.value;

    // Vérification complète des IDs requis
    if (!centreId || !service.id) {
      if (!centreId) {
        this.showError('Aucun centre sélectionné');
      }
      if (!service.id) {
        this.showError("La prestation n'a pas d'identifiant");
      }
      return;
    }

    this.isLoading = true;
    this.settingsService.toggleServiceStatus(centreId, service.id).subscribe({
      next: (isActive) => {
        service.isActive = isActive;
        this.showSuccess(`Statut de la prestation mis à jour`);
        this.isLoading = false;
      },
      error: (err) => {
        this.showError('Erreur lors de la modification du statut');
        console.error('Erreur détaillée:', err);
        this.isLoading = false;
      },
    });
  }

  confirmDelete(service: ServiceSetting): void {
    this.selectedService = service;

    const modalRef = this.modalService.open(ConfirmDialogComponent, {
      centered: true,
    });

    // Configuration des inputs
    modalRef.componentInstance.title = 'Supprimer la prestation';
    modalRef.componentInstance.message = `Êtes-vous sûr de vouloir supprimer la prestation "${service.name}" ?`;
    modalRef.componentInstance.details = 'Cette action est irréversible.';
    modalRef.componentInstance.confirmText = 'Supprimer';
    modalRef.componentInstance.cancelText = 'Annuler';

    // Gestion des événements
    modalRef.componentInstance.confirm.subscribe(() => {
      this.deleteService();
      modalRef.close();
    });

    modalRef.componentInstance.cancel.subscribe(() => {
      modalRef.dismiss();
    });
  }

  deleteService(): void {
    // Vérification complète des données requises
    if (!this.selectedService?.id) {
      this.showError('Aucune prestation sélectionnée ou ID manquant');
      return;
    }

    const centreId = this.serviceForm.get('centreId')?.value;
    if (!centreId) {
      this.showError('Aucun centre sélectionné');
      return;
    }

    this.isLoading = true;
    this.settingsService
      .deleteService(centreId, this.selectedService.id)
      .subscribe({
        next: () => {
          this.showSuccess('Prestation supprimée avec succès');
          this.loadServices(centreId);
          this.selectedService = null;
        },
        error: (err) => {
          this.showError('Erreur lors de la suppression de la prestation');
          console.error('Erreur détaillée:', err);
          this.isLoading = false;
        },
      });
  }

  refreshServices(): void {
    const centreId = this.serviceForm.get('centreId')?.value;
    if (centreId) {
      this.loadServices(centreId);
    }
  }

  isServiceIncluded(serviceId: string): boolean {
    return this.selectedService?.includedServices?.includes(serviceId) || false;
  }

  toggleIncludedService(serviceId: string): void {
    if (!this.selectedService) {
      this.selectedService = {
        id: '',
        includedServices: [],
      } as unknown as ServiceSetting;
    }

    if (!this.selectedService.includedServices) {
      this.selectedService.includedServices = [];
    }

    const index = this.selectedService.includedServices.indexOf(serviceId);
    if (index === -1) {
      this.selectedService.includedServices.push(serviceId);
    } else {
      this.selectedService.includedServices.splice(index, 1);
    }
  }

  getIncludedServices(): string[] {
    return this.selectedService?.includedServices || [];
  }

  getCategoryLabel(category: ServiceCategory): string {
    switch (category) {
      case ServiceCategory.Basic:
        return 'Basique';
      case ServiceCategory.Premium:
        return 'Premium';
      case ServiceCategory.Interior:
        return 'Intérieur';
      case ServiceCategory.Exterior:
        return 'Extérieur';
      case ServiceCategory.Special:
        return 'Spécial';
      case ServiceCategory.Maintenance:
        return 'Maintenance';
      default:
        return 'Inconnu';
    }
  }
  getCategoryClass(category: ServiceCategory): string {
    switch (category) {
      case ServiceCategory.Basic:
        return 'primary';
      case ServiceCategory.Premium:
        return 'warning';
      case ServiceCategory.Interior:
        return 'info';
      case ServiceCategory.Exterior:
        return 'success';
      case ServiceCategory.Special:
        return 'danger';
      case ServiceCategory.Maintenance:
        return 'secondary';
      default:
        return 'light';
    }
  }

  hasFieldError(field: string): boolean {
    const control = this.serviceForm.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getFieldError(field: string): string {
    const control = this.serviceForm.get(field);
    if (!control || !control.errors) return '';

    if (control.hasError('required')) {
      return 'Ce champ est obligatoire';
    } else if (control.hasError('maxlength')) {
      return `Maximum ${
        control.getError('maxlength').requiredLength
      } caractères`;
    } else if (control.hasError('min')) {
      return `La valeur doit être supérieure ou égale à ${
        control.getError('min').min
      }`;
    }

    return 'Valeur invalide';
  }

  markAllAsTouched(): void {
    Object.values(this.serviceForm.controls).forEach((control) => {
      control.markAsTouched();
    });
  }

  resetForm(): void {
    this.serviceForm.reset({
      centreId: this.serviceForm.get('centreId')?.value,
      name: '',
      category: '',
      description: '',
      basePrice: 0,
      duration: 30,
      sortOrder: 0,
      isActive: true,
      requiresApproval: false,
    });
    this.selectedService = null;
    this.isEditing = false;
    this.availableServices = [...this.services];
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  showError(message: string): void {
    this.errorMessage = message;
    setTimeout(() => this.clearMessages(), 5000);
  }

  showSuccess(message: string): void {
    this.successMessage = message;
    setTimeout(() => this.clearMessages(), 5000);
  }

  /**
   * Déconnecte l'utilisateur et le redirige vers la page de connexion
   */
  logout(): void {
    if (this.authService.isAuthenticated()) {
      try {
        console.log('État du localStorage avant déconnexion:', {
          token: !!this.authService.getToken(),
          userRole: localStorage.getItem('userRole'),
          profile: localStorage.getItem('currentUserProfile'),
        });

        this.authService.logout();

        console.log('État du localStorage après déconnexion:', {
          token: !!this.authService.getToken(),
          userRole: localStorage.getItem('userRole'),
          profile: localStorage.getItem('currentUserProfile'),
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

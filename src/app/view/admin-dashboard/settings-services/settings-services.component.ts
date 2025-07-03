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
import { DomSanitizer } from '@angular/platform-browser';
import { Users } from '../../../core/models/Users/Users';
import { UsersService } from '../../../core/services/Users/users.service';

@Component({
  selector: 'app-settings-services',
  imports: [RouterLink, CommonModule, ReactiveFormsModule],
  templateUrl: './settings-services.component.html',
  styleUrl: './settings-services.component.scss',
})
export class SettingsServicesComponent implements OnInit {
  //#region PROPRIÉTÉS
  serviceForm: FormGroup;
  services: ServiceSetting[] = [];
  centres: Centres[] = [];
  availableServices: ServiceSetting[] = [];
  selectedService: ServiceSetting | null = null;
  isEditing = false;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  hasDefaultSettings = false;
  isInitializingSettings = false;

  serviceCategories = [
    { value: ServiceCategory.Basic, label: 'Basique' },
    { value: ServiceCategory.Premium, label: 'Premium' },
    { value: ServiceCategory.Interior, label: 'Intérieur' },
    { value: ServiceCategory.Exterior, label: 'Extérieur' },
    { value: ServiceCategory.Special, label: 'Spécial' },
    { value: ServiceCategory.Maintenance, label: 'Maintenance' }
  ];

  users: Users[] = [];
  displayedUsers: Users[] = [];
  currentUser: Users | null = null;
  user: Users | null = null;
  //#endregion

  //#region CONSTRUCTEUR ET INITIALISATION
  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService,
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
    this.getUsers();
    this.loadCurrentUser();

    this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
      }
    });
  }
  //#endregion

  //#region GESTION DES UTILISATEURS
  /**
   * Charge les photos des utilisateurs et les sécurise pour l'affichage.
   */
  loadUserPhotos(): void {
    this.displayedUsers.forEach((user) => {
      if (user.photoUrl && typeof user.photoUrl === 'string') {
        this.usersService.getUserPhoto(user.photoUrl).subscribe((blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            user.photoSafeUrl = this.sanitizer.bypassSecurityTrustUrl(
              reader.result as string
            );
          };
          reader.readAsDataURL(blob);
        });
      }
    });
  }

  /**
   * Récupère tous les utilisateurs et charge leurs photos.
   */
  getUsers(): void {
    this.usersService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loadUserPhotos();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des utilisateurs', error);
      },
    });
  }

  /**
   * Charge l'utilisateur actuellement connecté.
   */
  loadCurrentUser(): void {
    this.authService.loadCurrentUserProfile().subscribe({
      next: (user) => {
        if (user) {
          this.currentUser = user;
          this.loadCurrentUserPhoto();
        } else {
          this.usersService.getCurrentUser().subscribe({
            next: (user) => {
              this.currentUser = user;
              this.loadCurrentUserPhoto();
            },
            error: (error) => {
              console.error(
                "Erreur lors du chargement de l'utilisateur connecté",
                error
              );
            },
          });
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement du profil utilisateur', error);
        this.usersService.getCurrentUser().subscribe({
          next: (user) => {
            this.currentUser = user;
            this.loadCurrentUserPhoto();
          },
          error: (error) => {
            console.error(
              "Erreur lors du chargement de l'utilisateur connecté",
              error
            );
          },
        });
      },
    });
  }

  /**
   * Charge la photo de l'utilisateur actuellement connecté.
   */
  loadCurrentUserPhoto(): void {
    if (!this.currentUser) return;

    if (this.currentUser.photoUrl && typeof this.currentUser.photoUrl === 'string') {
      this.usersService.getUserPhoto(this.currentUser.photoUrl).subscribe({
        next: (blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            this.currentUser!.photoSafeUrl =
              this.sanitizer.bypassSecurityTrustUrl(reader.result as string);
          };
          reader.readAsDataURL(blob);
        },
        error: (error) => {
          console.error('Erreur lors du chargement de la photo utilisateur', error);
          this.currentUser!.photoSafeUrl =
            this.sanitizer.bypassSecurityTrustUrl('assets/images/default-avatar.png');
        },
      });
    } else {
      this.currentUser.photoSafeUrl = this.sanitizer.bypassSecurityTrustUrl(
        'assets/images/default-avatar.png'
      );
    }
  }

  /**
   * Retourne le nom complet de l'utilisateur connecté
   */
  getFullName(): string {
    if (this.currentUser) {
      const firstName = this.currentUser.firstName || '';
      const lastName = this.currentUser.lastName || '';
      return `${firstName} ${lastName}`.trim() || 'Utilisateur';
    }
    return 'Utilisateur';
  }

  /**
   * Retourne le rôle de l'utilisateur connecté
   */
  getUserRole(): string {
    if (!this.currentUser) return 'Rôle non défini';

    if (this.currentUser.roles && this.currentUser.roles.length > 0) {
      return this.mapRoleIdToName(this.currentUser.roles[0]);
    }

    const role = this.authService.getUserRole();
    return role ? this.mapRoleIdToName(role) : 'Rôle non défini';
  }

  private mapRoleIdToName(roleId: string): string {
    const roleMapping: { [key: string]: string } = {
      '1': 'Administrateur',
      '2': 'Manager',
      '3': 'Éditeur',
      '4': 'Utilisateur',
    };
    return roleMapping[roleId] || 'Administrateur';
  }
  //#endregion

  //#region GESTION DES CENTRES ET SERVICES
  /**
   * Vérifie si un centre a des paramètres par défaut configurés
   * @param centreId L'identifiant du centre à vérifier
   */
  private checkDefaultSettings(centreId: string): void {
    this.settingsService.getServices(centreId).subscribe({
      next: (services) => {
        this.hasDefaultSettings = services.length > 0;
        if (!this.hasDefaultSettings) {
          this.showDefaultSettingsPrompt(centreId);
        }
      },
      error: () => {
        this.hasDefaultSettings = false;
      }
    });
  }

  /**
   * Affiche une invite pour créer les paramètres par défaut
   * @param centreId L'identifiant du centre concerné
   */
  private showDefaultSettingsPrompt(centreId: string): void {
    this.showError(`Aucune configuration trouvée pour ce centre. Voulez-vous créer les paramètres par défaut ?`);
  }

  /**
   * Initialise les paramètres par défaut pour le centre sélectionné
   */
  initializeDefaultSettings(): void {
    const centreId = this.serviceForm.get('centreId')?.value;

    if (!centreId) {
      this.showError('Aucun centre sélectionné');
      return;
    }

    this.isInitializingSettings = true;

    this.settingsService.createDefaultSettings(centreId).subscribe({
      next: (settings) => {
        this.showSuccess('Paramètres par défaut créés avec succès');
        this.hasDefaultSettings = true;
        this.isInitializingSettings = false;
        this.loadServices(centreId);
      },
      error: (err) => {
        this.showError('Erreur lors de la création des paramètres par défaut');
        console.error('Erreur détaillée:', err);
        this.isInitializingSettings = false;
      }
    });
  }

  /**
   * Charge la liste des centres disponibles
   */
  loadCentres(): void {
    this.isLoading = true;
    this.centreService.getAllCentres().subscribe({
      next: (centres) => {
        this.centres = centres;
        this.isLoading = false;
        if (centres.length > 0 && centres[0].id) {
          this.serviceForm.patchValue({ centreId: centres[0].id });
          this.loadServices(centres[0].id);
          this.checkDefaultSettings(centres[0].id);
        }
      },
      error: () => {
        this.showError('Erreur lors du chargement des centres');
        this.isLoading = false;
      },
    });
  }

  /**
   * Gère le changement de centre sélectionné
   */
  onCentreChange(): void {
    const centreId = this.serviceForm.get('centreId')?.value;
    if (centreId) {
      this.loadServices(centreId);
      this.checkDefaultSettings(centreId);
    }
  }

  /**
   * Charge les services pour un centre donné
   * @param centreId L'identifiant du centre
   */
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

  /**
   * Soumet le formulaire de service
   */
  onSubmit(): void {
    if (this.serviceForm.invalid) {
      this.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formValue = this.serviceForm.value;
    const centreId = formValue.centreId;

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

  /**
   * Modifie un service existant
   * @param service Le service à modifier
   */
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

    this.availableServices = this.services.filter((s) => s.id !== service.id);
    document.getElementById('service-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Annule l'édition en cours
   */
  cancelEdit(): void {
    this.resetForm();
  }

  /**
   * Bascule l'état actif/inactif d'un service
   * @param service Le service à modifier
   */
  toggleServiceStatus(service: ServiceSetting): void {
    const centreId = this.serviceForm.get('centreId')?.value;

    if (!centreId || !service.id) {
      if (!centreId) this.showError('Aucun centre sélectionné');
      if (!service.id) this.showError("La prestation n'a pas d'identifiant");
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

  /**
   * Confirme la suppression d'un service
   * @param service Le service à supprimer
   */
  confirmDelete(service: ServiceSetting): void {
    this.selectedService = service;

    const modalRef = this.modalService.open(ConfirmDialogComponent, {
      centered: true,
    });

    modalRef.componentInstance.title = 'Supprimer la prestation';
    modalRef.componentInstance.message = `Êtes-vous sûr de vouloir supprimer la prestation "${service.name}" ?`;
    modalRef.componentInstance.details = 'Cette action est irréversible.';
    modalRef.componentInstance.confirmText = 'Supprimer';
    modalRef.componentInstance.cancelText = 'Annuler';

    modalRef.componentInstance.confirm.subscribe(() => {
      this.deleteService();
      modalRef.close();
    });

    modalRef.componentInstance.cancel.subscribe(() => {
      modalRef.dismiss();
    });
  }

  /**
   * Supprime le service sélectionné
   */
  deleteService(): void {
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
    this.settingsService.deleteService(centreId, this.selectedService.id).subscribe({
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

  /**
   * Rafraîchit la liste des services
   */
  refreshServices(): void {
    const centreId = this.serviceForm.get('centreId')?.value;
    if (centreId) {
      this.loadServices(centreId);
    }
  }

  /**
   * Vérifie si un service est inclus dans le service sélectionné
   * @param serviceId L'identifiant du service à vérifier
   */
  isServiceIncluded(serviceId: string): boolean {
    return this.selectedService?.includedServices?.includes(serviceId) || false;
  }

  /**
   * Bascule l'inclusion d'un service dans le service sélectionné
   * @param serviceId L'identifiant du service à inclure/exclure
   */
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

  /**
   * Récupère les services inclus dans le service sélectionné
   */
  getIncludedServices(): string[] {
    return this.selectedService?.includedServices || [];
  }

  /**
   * Retourne le libellé d'une catégorie de service
   * @param category La catégorie à traduire
   */
  getCategoryLabel(category: ServiceCategory): string {
    switch (category) {
      case ServiceCategory.Basic: return 'Basique';
      case ServiceCategory.Premium: return 'Premium';
      case ServiceCategory.Interior: return 'Intérieur';
      case ServiceCategory.Exterior: return 'Extérieur';
      case ServiceCategory.Special: return 'Spécial';
      case ServiceCategory.Maintenance: return 'Maintenance';
      default: return 'Inconnu';
    }
  }

  /**
   * Retourne la classe CSS correspondant à une catégorie de service
   * @param category La catégorie à mapper
   */
  getCategoryClass(category: ServiceCategory): string {
    switch (category) {
      case ServiceCategory.Basic: return 'primary';
      case ServiceCategory.Premium: return 'warning';
      case ServiceCategory.Interior: return 'info';
      case ServiceCategory.Exterior: return 'success';
      case ServiceCategory.Special: return 'danger';
      case ServiceCategory.Maintenance: return 'secondary';
      default: return 'light';
    }
  }
  //#endregion

  //#region GESTION DU FORMULAIRE
  /**
   * Vérifie si un champ du formulaire contient une erreur
   * @param field Le nom du champ à vérifier
   */
  hasFieldError(field: string): boolean {
    const control = this.serviceForm.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  /**
   * Récupère le message d'erreur d'un champ du formulaire
   * @param field Le nom du champ à vérifier
   */
  getFieldError(field: string): string {
    const control = this.serviceForm.get(field);
    if (!control || !control.errors) return '';

    if (control.hasError('required')) {
      return 'Ce champ est obligatoire';
    } else if (control.hasError('maxlength')) {
      return `Maximum ${control.getError('maxlength').requiredLength} caractères`;
    } else if (control.hasError('min')) {
      return `La valeur doit être supérieure ou égale à ${control.getError('min').min}`;
    }

    return 'Valeur invalide';
  }

  /**
   * Marque tous les champs du formulaire comme "touchés"
   */
  markAllAsTouched(): void {
    Object.values(this.serviceForm.controls).forEach((control) => {
      control.markAsTouched();
    });
  }

  /**
   * Réinitialise le formulaire
   */
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
  //#endregion

  //#region GESTION DES MESSAGES
  /**
   * Efface les messages d'erreur et de succès
   */
  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  /**
   * Affiche un message d'erreur
   * @param message Le message à afficher
   */
  showError(message: string): void {
    this.errorMessage = message;
    setTimeout(() => this.clearMessages(), 5000);
  }

  /**
   * Affiche un message de succès
   * @param message Le message à afficher
   */
  showSuccess(message: string): void {
    this.successMessage = message;
    setTimeout(() => this.clearMessages(), 5000);
  }
  //#endregion

  //#region GESTION DE L'AUTHENTIFICATION
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
  //#endregion
}

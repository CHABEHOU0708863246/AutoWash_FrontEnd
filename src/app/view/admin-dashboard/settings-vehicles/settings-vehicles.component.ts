import { Component, OnInit, TemplateRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { DomSanitizer } from '@angular/platform-browser';
import { Users } from '../../../core/models/Users/Users';
import { UsersService } from '../../../core/services/Users/users.service';
import { Subscription } from 'rxjs';

import { VehiclesSettingsService } from '../../../core/services/VehiclesSettings/vehicles-settings.service';
import { ApiResponseData } from '../../../core/models/ApiResponseData';
import { VehicleSize } from '../../../core/models/Settings/Vehicles/VehicleSize';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { Centres } from '../../../core/models/Centres/Centres';
import { ToastService } from '../../../core/services/Toast/toast.service';
import { RolesService } from '../../../core/services/Roles/roles.service';
import { VehicleTypeSettings, VehicleTypeHistory } from '../../../core/models/Settings/Vehicles/VehicleTypeSettings';
import { VehicleTypeStatistics } from '../../../core/models/Settings/Vehicles/VehicleTypeStatistics';

@Component({
  selector: 'app-settings-vehicles',
  imports: [RouterLink, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './settings-vehicles.component.html',
  styleUrl: './settings-vehicles.component.scss',
})
export class SettingsVehiclesComponent implements OnInit {
  //#region PROPRIÉTÉS
  // Enums et constantes
  VehicleSize = VehicleSize;
  availableIcons: string[] = [
    'fas fa-car',
    'fas fa-motorcycle',
    'fas fa-truck',
    'fas fa-truck-pickup',
    'fas fa-car-side',
    'fas fa-bus',
    'fas fa-taxi',
    'fas fa-shuttle-van',
  ];

  vehicleSizes = [
    { value: 'Small', label: 'Petit' },
    { value: 'Medium', label: 'Moyen' },
    { value: 'Large', label: 'Grand' },
    { value: 'XLarge', label: 'Très grand' },
  ];

  // États de l'application
  isLoading: boolean = false;
  isEditMode: boolean = false;
  isAdmin: boolean = false;
  showCentreSelector: boolean = true;
  showHistory: boolean = false;
  showStatistics: boolean = false;

  // Données principales
  displayedUsers: Users[] = [];
  user: Users | null = null;
  users: Users[] = [];
  currentUser: Users | null = null;
  userRoles: any;
  centres: Centres[] = [];
  availableCentres: any[] = [];
  vehicleTypes: VehicleTypeSettings[] = [];
  filteredVehicleTypes: VehicleTypeSettings[] = [];
  selectedVehicleTypeForDetails: VehicleTypeSettings | null = null;
  currentVehicleTypeHistory: VehicleTypeHistory[] = [];
  currentVehicleTypeStatistics: VehicleTypeStatistics | null = null;

  // Filtres et recherche
  searchQuery: string = '';
  centreId: string = '';
  selectedCentreId: string = '';

  // Formulaire
  vehicleTypeForm: Partial<VehicleTypeSettings> = {
    label: '',
    description: '',
    defaultSizeMultiplier: 1,
    defaultSortOrder: 0,
    isActive: true,
    estimatedDurationMinutes: 30,
    extraDurationMinutes: 0,
    isAvailableOnline: true,
    isAvailableInStore: true,
    requiresApproval: false,
    requiresSpecialEquipment: false,
    requiredEquipment: [],
    serviceMultipliers: {},
    customProperties: {},
  };

  // Identifiants et références
  currentVehicleTypeId: string | null = null;
  private modalRef: NgbModalRef | null = null;
  private subscriptions: Subscription = new Subscription();

  // Messages
  errorMessage: string | null = null;
  successMessage: string = '';
  //#endregion

  //#region CONSTRUCTEUR ET LIFECYCLE HOOKS
  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService,
    private vehiclesSettingsService: VehiclesSettingsService,
    private router: Router,
    private authService: AuthService,
    private centresService: CentresService,
    private modalService: NgbModal,
    private toastr: ToastService,
    private rolesService: RolesService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.getUsers();
    this.loadCentres();

    const userSub = this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
        this.checkUserRole(user);
      }
    });
    this.subscriptions.add(userSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.modalRef) {
      this.modalRef.dismiss();
    }
  }
  //#endregion

  //#region MÉTHODES UTILITAIRES
  getSizeIcon(size: VehicleSize): string {
    switch (size) {
      case VehicleSize.Small:
        return 'fas fa-motorcycle';
      case VehicleSize.Medium:
        return 'fas fa-car';
      case VehicleSize.Large:
        return 'fas fa-truck-pickup';
      case VehicleSize.XLarge:
        return 'fas fa-truck';
      default:
        return 'fas fa-question';
    }
  }

  getSizeLabel(size: VehicleSize): string {
    switch (size) {
      case VehicleSize.Small:
        return 'Petit';
      case VehicleSize.Medium:
        return 'Moyen';
      case VehicleSize.Large:
        return 'Grand';
      case VehicleSize.XLarge:
        return 'Très grand';
      default:
        return 'Autre';
    }
  }

  trackVehicleTypeById(index: number, vehicleType: VehicleTypeSettings): string {
    return vehicleType.id || index.toString();
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = '';
  }
  //#endregion

  //#region GESTION DES UTILISATEURS
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
              console.error("Erreur lors du chargement de l'utilisateur connecté", error);
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
            console.error("Erreur lors du chargement de l'utilisateur connecté", error);
          },
        });
      },
    });
  }

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

  getFullName(): string {
    if (this.currentUser) {
      const firstName = this.currentUser.firstName || '';
      const lastName = this.currentUser.lastName || '';
      return `${firstName} ${lastName}`.trim() || 'Utilisateur';
    }
    return 'Utilisateur';
  }

  getUserRole(): string {
    if (!this.currentUser) return 'Rôle non défini';

    if (this.currentUser.roles && this.currentUser.roles.length > 0) {
      return this.mapRoleIdToName(this.currentUser.roles[0]);
    }

    const role = this.authService.getUserRole();
    return role ? this.mapRoleIdToName(role) : 'Rôle non défini';
  }

  mapRoleIdToName(roleId: string): string {
    const roleMapping: { [key: string]: string } = {
      '1': 'Administrateur',
      '2': 'Manager',
      '3': 'Éditeur',
      '4': 'Utilisateur',
    };

    return roleMapping[roleId] || 'Administrateur';
  }

  logout(): void {
    if (this.authService.isAuthenticated()) {
      try {
        console.log('État du localStorage avant déconnexion:', {});
        this.authService.logout();
        console.log('État du localStorage après déconnexion:', {});
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

  //#region GESTION DES RÔLES ET CENTRES
  async checkUserRole(user: Users): Promise<void> {
    this.userRoles = user.roles || [];
    this.isAdmin = await this.rolesService.isUserAdmin(this.userRoles);

    if (this.isAdmin) {
      this.showCentreSelector = this.availableCentres.length > 0;
      if (this.availableCentres.length === 1) {
        this.selectedCentreId = this.availableCentres[0].id || '';
        this.centreId = this.availableCentres[0].id || '';
        this.loadVehicleTypes();
      }
    } else {
      this.centreId = user.centreId || '';
      this.selectedCentreId = user.centreId || '';
      this.showCentreSelector = false;
      if (this.centreId) {
        this.loadVehicleTypes();
      }
    }
  }

  async hasSpecificRole(roleCode: string): Promise<boolean> {
    return await this.rolesService.hasRole(this.userRoles, roleCode);
  }

  loadCentres(): void {
    this.centresService.getAllCentres().subscribe({
      next: (centres) => {
        this.availableCentres = centres;
        if (centres.length === 0) {
          console.warn('Aucun centre trouvé dans la base de données');
          this.errorMessage = 'Aucun centre disponible';
        } else {
          if (this.currentUser) {
            this.checkUserRole(this.currentUser);
          }
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des centres:', error);
        this.errorMessage = 'Erreur lors du chargement des centres: ' + (error.message || error);
      },
    });
  }

  onCentreChange(): void {
    if (this.selectedCentreId) {
      this.centreId = this.selectedCentreId;
      this.vehicleTypes = [];
      this.filteredVehicleTypes = [];
      this.errorMessage = null;
      this.loadVehicleTypes();
    } else {
      this.centreId = '';
      this.vehicleTypes = [];
      this.filteredVehicleTypes = [];
    }
  }
  //#endregion

  //#region GESTION DES TYPES DE VÉHICULES
  loadVehicleTypes(): void {
    if (!this.centreId) {
      console.warn('Aucun centreId défini');
      this.vehicleTypes = [];
      this.filteredVehicleTypes = [];
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const loadSub = this.vehiclesSettingsService
      .getVehicleTypesByCentre(this.centreId)
      .subscribe({
        next: (response: any) => {
          if (Array.isArray(response)) {
            this.vehicleTypes = response;
          } else if (response && response.data && Array.isArray(response.data)) {
            this.vehicleTypes = response.data;
          } else {
            console.error('Format de réponse inattendu:', response);
            this.vehicleTypes = [];
          }

          this.filteredVehicleTypes = [...this.vehicleTypes];
          this.isLoading = false;

          if (this.vehicleTypes.length === 0) {
            this.successMessage = 'Aucun type de véhicule configuré pour ce centre. Vous pouvez en créer ou utiliser les types par défaut.';
          } else {
            this.successMessage = '';
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement:', error);
          this.handleError('Erreur lors du chargement des types de véhicules', error);
          this.isLoading = false;
          this.vehicleTypes = [];
          this.filteredVehicleTypes = [];
        },
      });

    this.subscriptions.add(loadSub);
  }

  loadActiveVehicleTypes(): void {
    if (!this.centreId) return;

    this.isLoading = true;
    const loadSub = this.vehiclesSettingsService
      .getActiveVehicleTypesByCentre(this.centreId)
      .subscribe({
        next: (response: ApiResponseData<VehicleTypeSettings[]>) => {
          this.vehicleTypes = response.data || [];
          this.filteredVehicleTypes = [...this.vehicleTypes];
          this.isLoading = false;
        },
        error: (error) => {
          this.handleError('Erreur lors du chargement des types de véhicules actifs', error);
          this.isLoading = false;
        },
      });

    this.subscriptions.add(loadSub);
  }

  loadVehicleTypesBySize(size: VehicleSize): void {
    if (!this.centreId) return;

    this.isLoading = true;
    const loadSub = this.vehiclesSettingsService
      .getVehicleTypesBySize(this.centreId, size)
      .subscribe({
        next: (response: ApiResponseData<VehicleTypeSettings[]>) => {
          this.vehicleTypes = response.data || [];
          this.filteredVehicleTypes = [...this.vehicleTypes];
          this.isLoading = false;
        },
        error: (error) => {
          this.handleError(`Erreur lors du chargement des types de véhicules ${this.getSizeLabel(size)}`, error);
          this.isLoading = false;
        },
      });

    this.subscriptions.add(loadSub);
  }

  loadVehicleTypeHistory(vehicleTypeId: string): void {
    const historySub = this.vehiclesSettingsService
      .getVehicleTypeHistory(vehicleTypeId, 20)
      .subscribe({
        next: (response: ApiResponseData<VehicleTypeHistory[]>) => {
          this.currentVehicleTypeHistory = response.data || [];
          this.showHistory = true;
        },
        error: (error) => {
          this.handleError("Erreur lors du chargement de l'historique", error);
        },
      });

    this.subscriptions.add(historySub);
  }
  //#endregion

  //#region RECHERCHE ET FILTRES
  onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.filteredVehicleTypes = [...this.vehicleTypes];
      return;
    }

    if (this.centreId) {
      const searchSub = this.vehiclesSettingsService
        .searchVehicleTypes(this.centreId, this.searchQuery)
        .subscribe({
          next: (response: ApiResponseData<VehicleTypeSettings[]>) => {
            this.filteredVehicleTypes = response.data || [];
          },
          error: (error) => {
            this.performClientSideSearch();
          },
        });

      this.subscriptions.add(searchSub);
    } else {
      this.performClientSideSearch();
    }
  }

  performClientSideSearch(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredVehicleTypes = this.vehicleTypes.filter(
      (type) =>
        type.label.toLowerCase().includes(query) ||
        type.description?.toLowerCase().includes(query) ||
        VehicleSize[type.size].toLowerCase().includes(query)
    );
  }
  //#endregion

  //#region GESTION DES MODALS
  openAddModal(modal: TemplateRef<any>): void {
    if (!this.centreId) {
      this.errorMessage = "Veuillez sélectionner un centre avant d'ajouter un type de véhicule";
      return;
    }

    this.resetForm();
    this.isEditMode = false;
    this.modalRef = this.modalService.open(modal, { size: 'lg' });
  }

  openEditModal(modal: TemplateRef<any>, vehicleType: VehicleTypeSettings): void {
    if (!modal) {
      console.error('Référence du modal manquante');
      this.errorMessage = 'Erreur technique : référence du modal manquante';
      return;
    }

    if (!vehicleType || !vehicleType.id) {
      console.error('VehicleType invalide:', vehicleType);
      this.errorMessage = 'Impossible de modifier ce type de véhicule';
      return;
    }

    if (this.modalRef) {
      this.modalRef.close();
      this.modalRef = null;
    }

    this.isEditMode = true;
    this.currentVehicleTypeId = vehicleType.id;
    this.errorMessage = '';

    const loadSub = this.vehiclesSettingsService
      .getVehicleTypeById(vehicleType.id)
      .subscribe({
        next: (response: any) => {
          const fullVehicleType = response.data || response;
          if (fullVehicleType && fullVehicleType.id) {
            this.vehicleTypeForm = {
              label: fullVehicleType.label || '',
              description: fullVehicleType.description || '',
              size: fullVehicleType.size || 1,
              defaultSizeMultiplier: fullVehicleType.defaultSizeMultiplier || 1,
              defaultSortOrder: fullVehicleType.defaultSortOrder || 0,
              iconUrl: fullVehicleType.iconUrl || '',
              isActive: fullVehicleType.isActive !== false,
              estimatedDurationMinutes: fullVehicleType.estimatedDurationMinutes || 0,
              extraDurationMinutes: fullVehicleType.extraDurationMinutes || 0,
              isAvailableOnline: fullVehicleType.isAvailableOnline !== false,
              isAvailableInStore: fullVehicleType.isAvailableInStore !== false,
              requiresApproval: fullVehicleType.requiresApproval || false,
              requiresSpecialEquipment: fullVehicleType.requiresSpecialEquipment || false,
              requiredEquipment: [...(fullVehicleType.requiredEquipment || [])],
              serviceMultipliers: { ...fullVehicleType.serviceMultipliers },
              customProperties: { ...fullVehicleType.customProperties },
              minPrice: fullVehicleType.minPrice,
              maxPrice: fullVehicleType.maxPrice,
              hasCustomPricing: fullVehicleType.hasCustomPricing || false,
              maxReservationsPerDay: fullVehicleType.maxReservationsPerDay || 0,
            };

            try {
              this.modalRef = this.modalService.open(modal, {
                size: 'lg',
                backdrop: 'static',
                keyboard: false
              });

              this.modalRef.result.then(
                (result) => { this.resetEditMode(); },
                (dismissed) => { this.resetEditMode(); }
              );

            } catch (error) {
              console.error('Erreur lors de l\'ouverture du modal:', error);
              this.errorMessage = 'Erreur lors de l\'ouverture du modal d\'édition';
              this.resetEditMode();
            }
          } else {
            console.error('Données du véhicule non trouvées dans la réponse');
            this.errorMessage = 'Type de véhicule non trouvé';
          }
        },
        error: (error) => {
          console.error('Erreur API lors du chargement:', error);
          this.handleError('Erreur lors du chargement des détails du type de véhicule', error);
        },
      });

    this.subscriptions.add(loadSub);
  }

  closeModal(): void {
    if (this.modalRef) {
      this.modalRef.close();
      this.modalRef = null;
    }
    this.resetForm();
  }

  private resetEditMode(): void {
    this.isEditMode = false;
    this.currentVehicleTypeId = null;
    this.modalRef = null;
    this.vehicleTypeForm = this.getDefaultForm();
  }
  //#endregion

  //#region GESTION DU FORMULAIRE
  resetForm(): void {
    this.vehicleTypeForm = {
      label: '',
      description: '',
      defaultSizeMultiplier: 1,
      defaultSortOrder: 0,
      isActive: true,
      estimatedDurationMinutes: 30,
      extraDurationMinutes: 0,
      isAvailableOnline: true,
      isAvailableInStore: true,
      requiresApproval: false,
      requiresSpecialEquipment: false,
      requiredEquipment: [],
      serviceMultipliers: {},
      customProperties: {},
    };
    this.currentVehicleTypeId = null;
    this.isEditMode = false;
    this.errorMessage = null;
  }

  private getDefaultForm(): any {
    return {
      label: '',
      description: '',
      size: 1,
      defaultSizeMultiplier: 1,
      defaultSortOrder: 0,
      iconUrl: '',
      isActive: true,
      estimatedDurationMinutes: 0,
      extraDurationMinutes: 0,
      isAvailableOnline: true,
      isAvailableInStore: true,
      requiresApproval: false,
      requiresSpecialEquipment: false,
      requiredEquipment: [],
      serviceMultipliers: {},
      customProperties: {},
      minPrice: null,
      maxPrice: null,
      hasCustomPricing: false,
      maxReservationsPerDay: 0,
    };
  }

  isFormValid(): boolean {
    return !!(
      this.vehicleTypeForm.label?.trim() &&
      this.vehicleTypeForm.defaultSizeMultiplier !== undefined &&
      this.vehicleTypeForm.defaultSizeMultiplier > 0 &&
      this.vehicleTypeForm.defaultSortOrder !== undefined &&
      this.centreId
    );
  }

  selectIcon(icon: string): void {
    this.vehicleTypeForm.iconUrl = icon;
  }

  addRequiredEquipment(equipment: string): void {
    if (!equipment.trim()) return;
    if (!this.vehicleTypeForm.requiredEquipment) {
      this.vehicleTypeForm.requiredEquipment = [];
    }
    if (!this.vehicleTypeForm.requiredEquipment.includes(equipment)) {
      this.vehicleTypeForm.requiredEquipment.push(equipment);
    }
  }

  removeRequiredEquipment(equipment: string): void {
    if (this.vehicleTypeForm.requiredEquipment) {
      this.vehicleTypeForm.requiredEquipment =
        this.vehicleTypeForm.requiredEquipment.filter((eq) => eq !== equipment);
    }
  }
  //#endregion

  //#region CRUD DES TYPES DE VÉHICULES
  saveVehicleType(): void {
    if (!this.isFormValid()) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires';
      return;
    }

    if (!this.currentUser?.id) {
      this.errorMessage = 'Utilisateur non connecté';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    if (this.isEditMode && this.currentVehicleTypeId) {
      this.updateVehicleType();
    } else {
      this.createVehicleType();
    }
  }

  createVehicleType(): void {
    const vehicleTypeData = new VehicleTypeSettings({
      ...this.vehicleTypeForm,
      centreId: this.centreId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const createSub = this.vehiclesSettingsService
      .createVehicleType(vehicleTypeData)
      .subscribe({
        next: (response: ApiResponseData<VehicleTypeSettings>) => {
          this.successMessage = 'Type de véhicule créé avec succès';
          this.loadVehicleTypes();
          this.closeModal();
          this.isLoading = false;
        },
        error: (error) => {
          this.handleError('Erreur lors de la création du type de véhicule', error);
          this.isLoading = false;
        },
      });

    this.subscriptions.add(createSub);
  }

  updateVehicleType(): void {
    if (!this.currentVehicleTypeId || !this.currentUser?.id) {
      console.error('ID du véhicule ou utilisateur manquant');
      return;
    }

    const vehicleTypeData: any = {
      ...this.vehicleTypeForm,
      id: this.currentVehicleTypeId,
      centreId: this.centreId,
      updatedAt: new Date().toISOString(),
      updatedBy: this.currentUser.id,
      label: this.vehicleTypeForm.label || '',
      description: this.vehicleTypeForm.description || '',
      size: this.vehicleTypeForm.size || 1,
      isActive: this.vehicleTypeForm.isActive !== false,
      defaultSizeMultiplier: this.vehicleTypeForm.defaultSizeMultiplier || 1,
      defaultSortOrder: this.vehicleTypeForm.defaultSortOrder || 0,
      iconUrl: this.vehicleTypeForm.iconUrl || '',
      estimatedDurationMinutes: this.vehicleTypeForm.estimatedDurationMinutes || 0,
      extraDurationMinutes: this.vehicleTypeForm.extraDurationMinutes || 0,
      isAvailableOnline: this.vehicleTypeForm.isAvailableOnline !== false,
      isAvailableInStore: this.vehicleTypeForm.isAvailableInStore !== false,
      requiresApproval: this.vehicleTypeForm.requiresApproval || false,
      requiresSpecialEquipment: this.vehicleTypeForm.requiresSpecialEquipment || false,
      requiredEquipment: this.vehicleTypeForm.requiredEquipment || [],
      serviceMultipliers: this.vehicleTypeForm.serviceMultipliers || {},
      customProperties: this.vehicleTypeForm.customProperties || {},
      hasCustomPricing: this.vehicleTypeForm.hasCustomPricing || false,
      maxReservationsPerDay: this.vehicleTypeForm.maxReservationsPerDay || 0
    };

    this.isLoading = true;

    const updateSub = this.vehiclesSettingsService
      .updateVehicleType(vehicleTypeData, this.currentUser.id)
      .subscribe({
        next: (response: any) => {
          this.successMessage = 'Type de véhicule mis à jour avec succès';
          this.loadVehicleTypes();
          this.closeModal();
          this.isLoading = false;
        },
        error: (error) => {
          if (error.error && error.error.errors) {
            console.error('Détails de validation:', error.error.errors);
            Object.keys(error.error.errors).forEach(field => {
              console.error(`- ${field}: ${error.error.errors[field].join(', ')}`);
            });
          }

          this.handleError('Erreur lors de la mise à jour du type de véhicule', error);
          this.isLoading = false;
        },
      });

    this.subscriptions.add(updateSub);
  }

  deleteVehicleType(vehicleTypeId: string): void {
    if (!this.currentUser?.id) {
      this.errorMessage = 'Utilisateur non connecté';
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce type de véhicule ?')) {
      return;
    }

    this.isLoading = true;
    const deleteSub = this.vehiclesSettingsService
      .deleteVehicleType(vehicleTypeId, this.currentUser.id)
      .subscribe({
        next: (response: ApiResponseData<boolean>) => {
          this.successMessage = 'Type de véhicule supprimé avec succès';
          this.loadVehicleTypes();
          this.isLoading = false;
        },
        error: (error) => {
          this.handleError('Erreur lors de la suppression du type de véhicule', error);
          this.isLoading = false;
        },
      });

    this.subscriptions.add(deleteSub);
  }

  toggleVehicleTypeStatus(vehicleType: VehicleTypeSettings): void {
    if (!this.currentUser?.id) return;

    const updatedVehicleType = new VehicleTypeSettings({
      ...vehicleType,
      isActive: !vehicleType.isActive,
      updatedAt: new Date(),
      updatedBy: this.currentUser.id,
    });

    const updateSub = this.vehiclesSettingsService
      .updateVehicleType(updatedVehicleType, this.currentUser.id)
      .subscribe({
        next: (response: ApiResponseData<VehicleTypeSettings>) => {
          this.successMessage = `Type de véhicule ${updatedVehicleType.isActive ? 'activé' : 'désactivé'} avec succès`;
          this.loadVehicleTypes();
        },
        error: (error) => {
          this.handleError('Erreur lors de la modification du statut', error);
        },
      });

    this.subscriptions.add(updateSub);
  }

  initializeDefaultVehicleTypes(): void {
    if (!this.centreId) {
      this.errorMessage = 'Veuillez sélectionner un centre';
      return;
    }

    if (!this.currentUser?.id) {
      this.errorMessage = 'Utilisateur non connecté';
      return;
    }

    if (!confirm('Créer les types de véhicules par défaut ? Cela ajoutera 5 types de véhicules standards.')) {
      return;
    }

    this.isLoading = true;
    const initSub = this.vehiclesSettingsService
      .initializeDefaultVehicleTypes(this.centreId, this.currentUser.id)
      .subscribe({
        next: (response: ApiResponseData<VehicleTypeSettings[]>) => {
          this.successMessage = `${response.data?.length || 0} types de véhicules par défaut créés avec succès`;
          this.loadVehicleTypes();
          this.isLoading = false;
        },
        error: (error) => {
          this.handleError("Erreur lors de l'initialisation des types par défaut", error);
          this.isLoading = false;
        },
      });

    this.subscriptions.add(initSub);
  }
  //#endregion

  //#region GESTION DES ERREURS
  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.errorMessage = `${message}: ${error.message || 'Erreur inconnue'}`;
  }
  //#endregion
}

import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormBuilder,
  Validators,
  FormArray,
  FormControl,
} from '@angular/forms';
import { Centres } from '../../../core/models/Centres/Centres';
import { DomSanitizer } from '@angular/platform-browser';
import { Users } from '../../../core/models/Users/Users';
import { UsersService } from '../../../core/services/Users/users.service';
import { ServiceSettingsService } from '../../../core/services/ServiceSettings/service-settings.service';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { ToastService } from '../../../core/services/Toast/toast.service';
import { ConfirmDialogComponent } from '../../../core/components/confirm-dialog/confirm-dialog.component';
import { BaseServices } from '../../../core/models/Settings/Services/BaseServices';
import { ServiceCategories } from '../../../core/models/Settings/Services/ServiceCategories';
import { ServiceSettings } from '../../../core/models/Settings/Services/ServiceSettings';

@Component({
  selector: 'app-settings-services',
  imports: [
    RouterLink,
    CommonModule,
    ReactiveFormsModule,
    ConfirmDialogComponent,
  ],
  templateUrl: './settings-services.component.html',
  styleUrl: './settings-services.component.scss',
})
export class SettingsServicesComponent implements OnInit {
  //#region PROPRIÉTÉS
  showConfirmDialog = false;
  currentServiceId: string | null = null;
  serviceForm: FormGroup;
  centres: Centres[] = [];
  services: ServiceSettings[] = [];
  filteredServices: ServiceSettings[] = [];
  isEditing = false;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  hasDefaultSettings = false;
  isInitializingSettings = false;
  currentEditingId: string | null = null;
  serviceCategories = ServiceCategories.getAll();
  baseServices = BaseServices.getAll();

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
    private router: Router,
    private authService: AuthService,
    private serviceSettingsService: ServiceSettingsService,
    private centresService: CentresService,
    private toastr: ToastService
  ) {
    this.serviceForm = this.fb.group({
      centreId: ['', [Validators.required, this.centreIdValidator.bind(this)]],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      category: ['', Validators.required],
      description: ['', Validators.maxLength(500)],
      duration: [30, [Validators.required, Validators.min(1)]],
      sortOrder: [0, [Validators.required, Validators.min(0)]],
      isActive: [true],
      requiresApproval: [false],
      includedServices: this.fb.array([]),
      basePrice: [0, [Validators.required, Validators.min(0)]],
      isAvailableOnline: [true],
      isAvailableInStore: [true],
    });

    // Initialize included services checkboxes
    this.baseServices.forEach(() =>
      this.includedServicesFormArray.push(new FormControl(false))
    );
  }

  ngOnInit(): void {
  this.loadCurrentUser();
  this.getUsers();
  this.loadCentres(); // Assure-vous que ceci se fait en premier

  // Attendez que les centres soient chargés avant de charger les services
  this.authService.currentUser$.subscribe((user) => {
    if (user && user !== this.currentUser) {
      this.currentUser = user;
      this.loadCurrentUserPhoto();
      // Chargez les services seulement après avoir l'utilisateur actuel
      if (user.centreId) {
        this.loadServices();
      }
    }
  });
}

  onCentreChange(centreId: string): void {
  console.log('Centre sélectionné:', centreId); // Pour débugger

  if (!centreId) {
    this.services = [];
    this.filteredServices = [];
    return;
  }

  if (this.isValidObjectId(centreId)) {
    this.getServicesByCentre(centreId);
  } else {
    this.toastr.showError('ID de centre invalide');
    this.services = [];
    this.filteredServices = [];
  }
}

  centreIdValidator(control: any) {
  const value = control.value;
  if (!value) return null; // Let required validator handle empty values

  // Vérifier que this.centres existe avant d'utiliser isValidObjectId
  if (!this.centres || this.centres.length === 0) {
    return null; // Pas d'erreur si les centres ne sont pas encore chargés
  }

  if (!this.isValidObjectId(value)) {
    return { invalidObjectId: true };
  }

  return null;
}

  get includedServicesFormArray(): FormArray {
    return this.serviceForm.get('includedServices') as FormArray;
  }
  //#endregion

  //#region CHARGEMENT DES DONNÉES
  /**
   * Charge tous les centres disponibles et les stocke dans la propriété `centres`.
   * Affiche un message d'erreur en cas d'échec du chargement.
   */
  loadCentres(): void {
  this.isLoading = true;
  this.centresService.getAllCentres().subscribe({
    next: (centres: any) => {
      console.log('Centres chargés:', centres); // Pour débugger
      this.centres = Array.isArray(centres) ? centres : (centres && centres.data ? centres.data : []);
      this.isLoading = false;
    },
    error: (error) => {
      console.error('Erreur chargement centres:', error);
      this.toastr.showError('Erreur lors du chargement des centres');
      this.centres = []; // Initialiser avec un tableau vide
      this.isLoading = false;
    },
  });
}

canSelectCentre(): boolean {
  return !this.currentUser?.centreId || this.isEditing;
}

  /**
   * Charge les services associés au centre de l'utilisateur actuel.
   * Affiche un message d'erreur si aucun centre n'est associé ou si l'ID du centre est invalide.
   */
  loadServices(): void {
    this.isLoading = true;
    const centreId = this.currentUser?.centreId;

    if (!centreId) {
      this.toastr.showError('Aucun centre associé à cet utilisateur');
      this.isLoading = false;
      return;
    }

    if (!this.isValidObjectId(centreId)) {
      this.toastr.showError('ID du centre invalide');
      this.isLoading = false;
      return;
    }

    this.serviceSettingsService.getServicesByCentre(centreId).subscribe({
      next: (response) => {
        this.services = response.data || [];
        this.filteredServices = [...this.services];
        this.isLoading = false;
      },
      error: (error) => {
        this.toastr.showError('Erreur lors du chargement des services');
        this.isLoading = false;
      },
    });
  }

  /**
   * Récupère les services associés à un centre spécifique.
   * Affiche un message d'erreur si l'ID du centre est invalide ou si la récupération échoue.
   * @param centreId L'ID du centre pour lequel récupérer les services.
   */
  getServicesByCentre(centreId: string): void {
    if (!centreId || !this.isValidObjectId(centreId)) return;

    this.isLoading = true;
    this.serviceSettingsService.getServicesByCentre(centreId).subscribe({
      next: (response) => {
        this.services = response.data || [];
        this.filteredServices = [...this.services];
        this.isLoading = false;
      },
      error: (error) => {
        this.toastr.showError('Erreur lors du chargement des services');
        this.isLoading = false;
      },
    });
  }
  //#endregion

  //#region GESTION DU FORMULAIRE
  onSubmit(): void {
    if (this.serviceForm.invalid) {
      this.markFormGroupTouched(this.serviceForm);
      return;
    }

    // Validate centreId before processing
    const centreId =
      this.currentUser?.centreId || this.serviceForm.get('centreId')?.value;
    if (!centreId || !this.isValidObjectId(centreId)) {
      this.toastr.showError('Veuillez sélectionner un centre valide');
      return;
    }

    this.isLoading = true;

    try {
      const formValue = this.prepareFormData();

      if (this.isEditing && this.currentEditingId) {
        this.updateService(this.currentEditingId, formValue);
      } else {
        this.createService(formValue);
      }
    } catch (error) {
      this.isLoading = false;
      console.error('Error preparing form data:', error);
    }
  }

  /**
   * Vérifie si l'ID est un ObjectId valide de MongoDB.
   * @param id L'ID à valider.
   * @returns true si l'ID est valide, sinon false.
   */
  isValidObjectId(id: string): boolean {
    // Check if it's exactly 24 characters and contains only hex characters
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
  }

  /**
   * Prépare les données du formulaire pour l'envoi.
   * Valide le centreId et construit l'objet à envoyer.
   * @returns L'objet contenant les données du service.
   */
  prepareFormData(): any {
  const formValue = this.serviceForm.value;
  const selectedServices = this.baseServices
    .filter((_, i) => formValue.includedServices[i])
    .map((service) => service);

  // CORRECTION: Utiliser formValue.centreId au lieu de currentUser.centreId
  let centreId = formValue.centreId || this.currentUser?.centreId;

  // Validate centreId before sending
  if (!centreId || !this.isValidObjectId(centreId)) {
    this.toastr.showError('ID du centre invalide');
    throw new Error('Invalid centreId');
  }

  return {
    ...formValue,
    includedServices: selectedServices,
    centreId: centreId, // CORRECTION: Utiliser la variable centreId
  };
}

  /**
   * Marque tous les contrôles du formulaire comme touchés pour afficher les erreurs de validation.
   * @param formGroup Le FormGroup ou FormArray à traiter.
   */
  markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();

      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Réinitialise le formulaire aux valeurs par défaut.
   * Réinitialise également l'état d'édition et l'ID de l'élément en cours d'édition.
   */
  resetForm(): void {
  const currentCentreId = this.serviceForm.get('centreId')?.value || this.currentUser?.centreId || '';

  this.serviceForm.reset({
    centreId: currentCentreId, // Garder le centre sélectionné
    name: '',
    category: '',
    description: '',
    duration: 30,
    sortOrder: 0,
    isActive: true,
    requiresApproval: false,
    includedServices: [],
    basePrice: 0,
    isAvailableOnline: true,
    isAvailableInStore: true,
  });

  // Réinitialiser les checkboxes
  this.includedServicesFormArray.clear();
  this.baseServices.forEach(() =>
    this.includedServicesFormArray.push(new FormControl(false))
  );

  this.isEditing = false;
  this.currentEditingId = null;
}

  /**
   * Remplit le formulaire avec les données d'un service existant.
   * Met à jour l'état d'édition et l'ID de l'élément en cours d'édition.
   * @param service Le service à éditer.
   */
  populateForm(service: ServiceSettings): void {
    this.serviceForm.patchValue({
      centreId: service.centreId,
      name: service.name,
      category: service.category,
      description: service.description || null, // Gère le cas undefined
      duration: service.duration,
      sortOrder: service.sortOrder,
      isActive: service.isActive,
      requiresApproval: service.requiresApproval,
      basePrice: service.basePrice,
      isAvailableOnline: service.isAvailableOnline,
      isAvailableInStore: service.isAvailableInStore,
    });

    // Mettre à jour les cases à cocher pour les services inclus
    this.includedServicesFormArray.clear();
    this.baseServices.forEach((serviceName) => {
      this.includedServicesFormArray.push(
        new FormControl(service.includedServices.includes(serviceName))
      );
    });

    this.isEditing = true;
    this.currentEditingId = service.id || null; // Conversion de undefined à null
  }
  //#endregion

  //#region CRUD OPERATIONS
  /**
   * Crée un nouveau service avec les données du formulaire.
   * Affiche un message de succès ou d'erreur en fonction du résultat de l'opération.
   * @param serviceData Les données du service à créer.
   */
  createService(formData: any): void {
  this.serviceSettingsService.createService(formData).subscribe({
    next: (response) => {
      this.toastr.showSuccess('Service créé avec succès');
      this.resetForm();
      this.loadServices(); // Recharger la liste
      this.isLoading = false;
    },
    error: (error) => {
      console.error('Erreur création service:', error);
      this.toastr.showError('Erreur lors de la création du service');
      this.isLoading = false;
    }
  });
}

  /**
   * Met à jour un service existant avec les données du formulaire.
   * Affiche un message de succès ou d'erreur en fonction du résultat de l'opération.
   * @param serviceId L'ID du service à mettre à jour.
   * @param serviceData Les données du service à mettre à jour.
   */
  updateService(serviceId: string, serviceData: any): void {
    const updatedBy = this.currentUser?.id;
    if (!updatedBy) {
      this.toastr.showError(
        'Utilisateur non identifié. Impossible de mettre à jour le service.'
      );
      this.isLoading = false;
      return;
    }

    this.serviceSettingsService
      .updateService(serviceId, serviceData, updatedBy)
      .subscribe({
        next: (response) => {
          this.toastr.showSuccess('Service mis à jour avec succès');
          this.resetForm();
          // Actualiser les deux tableaux
          this.loadServices();
          this.getServicesByCentre(serviceData.centreId);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors de la mise à jour:', error);
          this.toastr.showError('Erreur lors de la mise à jour du service');
          this.isLoading = false;
        },
      });
  }

  /**
   * Supprime un service en fonction de son ID.
   * Affiche un message de confirmation avant la suppression.
   * @param serviceId L'ID du service à supprimer.
   */
  deleteService(serviceId: string): void {
    if (!serviceId) {
      this.toastr.showError('ID du service manquant');
      return;
    }

    this.currentServiceId = serviceId;
    this.showConfirmDialog = true;
  }

  /**
   * Confirme la suppression du service actuellement sélectionné.
   * Supprime le service et met à jour les tableaux de services.
   */
  onConfirmDelete(): void {
    if (!this.currentServiceId) return;

    this.isLoading = true;
    this.serviceSettingsService.deleteService(this.currentServiceId).subscribe({
      next: (response) => {
        this.toastr.showSuccess('Service supprimé avec succès');

        // Supprimer directement l'élément des tableaux
        this.services = this.services.filter(
          (service) => service.id !== this.currentServiceId
        );
        this.filteredServices = this.filteredServices.filter(
          (service) => service.id !== this.currentServiceId
        );

        this.showConfirmDialog = false;
        this.currentServiceId = null;
        this.isLoading = false;
      },
      error: (error) => {
        this.toastr.showError('Erreur lors de la suppression du service');
        this.showConfirmDialog = false;
        this.currentServiceId = null;
        this.isLoading = false;
      },
    });
  }

  /**
   * Annule la suppression du service et ferme la boîte de dialogue de confirmation.
   */
  toggleServiceStatus(service: ServiceSettings): void {
    const newStatus = !service.isActive;
    this.serviceSettingsService
      .toggleServiceStatus(
        service.id || '',
        newStatus,
        this.currentUser?.id || ''
      )
      .subscribe({
        next: (response) => {
          this.toastr.showSuccess(
            `Service ${newStatus ? 'activé' : 'désactivé'} avec succès`
          );
          this.loadServices();
        },
        error: (error) => {
          this.toastr.showError('Erreur lors du changement de statut');
        },
      });
  }
  //#endregion

  //#region FILTRES ET RECHERCHE
  /**
   * Filtre les services par catégorie.
   * Si la catégorie est 'all', affiche tous les services.
   * @param category La catégorie à filtrer.
   */
  filterByCategory(category: string): void {
    if (category === 'all') {
      this.filteredServices = [...this.services];
    } else {
      this.filteredServices = this.services.filter(
        (s) => s.category === category
      );
    }
  }

  /**
   * Recherche des services par nom ou description.
   * Met à jour la liste des services filtrés en fonction du terme de recherche.
   * @param searchTerm Le terme de recherche saisi par l'utilisateur.
   */
  searchServices(searchTerm: string): void {
    if (!searchTerm) {
      this.filteredServices = [...this.services];
      return;
    }

    this.filteredServices = this.services.filter(
      (service) =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (service.description &&
          service.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
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

          if (user.centreId && this.isValidObjectId(user.centreId)) {
            this.serviceForm.patchValue({ centreId: user.centreId });
            this.loadServices(); // <-- Ajoutez ceci
          }

          this.loadCurrentUserPhoto();
        } else {
          this.usersService.getCurrentUser().subscribe({
            next: (user) => {
              this.currentUser = user;

              if (user.centreId && this.isValidObjectId(user.centreId)) {
                this.serviceForm.patchValue({ centreId: user.centreId });
                this.loadServices(); // <-- Ajoutez ceci
              }

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
      },
    });
  }

  /**
   * Charge la photo de l'utilisateur actuellement connecté.
   */
  loadCurrentUserPhoto(): void {
    if (!this.currentUser) return;

    if (
      this.currentUser.photoUrl &&
      typeof this.currentUser.photoUrl === 'string'
    ) {
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
          console.error(
            'Erreur lors du chargement de la photo utilisateur',
            error
          );
          this.currentUser!.photoSafeUrl =
            this.sanitizer.bypassSecurityTrustUrl(
              'assets/images/default-avatar.png'
            );
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

  //#region GESTION DE L'AUTHENTIFICATION
  /**
   * Déconnecte l'utilisateur et le redirige vers la page de connexion
   */
  logout(): void {
    if (this.authService.isAuthenticated()) {
      try {
        console.log('État du localStorage avant déconnexion:', {

        });

        this.authService.logout();

        console.log('État du localStorage après déconnexion:', {

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

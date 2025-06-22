import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { SettingsService } from '../../../core/services/Settings/settings.service';
import { VehicleTypeSetting, VehicleSize } from '../../../core/models/Settings/VehicleTypeSetting';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DomSanitizer } from '@angular/platform-browser';
import { Users } from '../../../core/models/Users/Users';
import { UsersService } from '../../../core/services/Users/users.service';

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
  centreId: string = '';
  isEditMode: boolean = false;
  currentVehicleTypeId: string | null = null;

  // Form fields for modal
  vehicleTypeForm = {
  name: '',
  description: '',
  size: VehicleSize.Medium,
  sizeMultiplier: 1.0,
  sortOrder: 0,
  isActive: true,
  iconUrl: '' // Gardez une valeur par défaut mais rendez le type optionnel
} as {
  name: string;
  description: string;
  size: VehicleSize;
  sizeMultiplier: number;
  sortOrder: number;
  isActive: boolean;
  iconUrl?: string; // Notez le ? pour rendre optionnel
};

  vehicleSizes = Object.values(VehicleSize).map(size => ({
    value: size,
    label: size
  }));
editModal: any;

  users: Users[] = []; // Liste complète des utilisateurs.
  displayedUsers: Users[] = []; // Liste des utilisateurs affichés sur la page actuelle.
  currentUser: Users | null = null; // Utilisateur actuellement connecté.
  user: Users | null = null; // Informations sur l'utilisateur connecté.

  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService, // Service pour interagir avec les utilisateurs.
    private router: Router,
    private settingsService: SettingsService,
    private authService: AuthService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.loadCurrentCentre();
    this.loadVehicleTypes();
    this.getUsers(); // Récupère les utilisateurs.
    this.loadCurrentUser(); // Charge l'utilisateur connecté

    // S'abonner aux changements de l'utilisateur connecté
    this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
      }
    });
  }

  /**
   * Charge les photos des utilisateurs et les sécurise pour l'affichage.
   * Utilise `DomSanitizer` pour éviter les problèmes de sécurité liés aux URLs.
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
   * Utilise le service UsersService pour obtenir la liste des utilisateurs.
   */
  getUsers(): void {
    this.usersService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loadUserPhotos(); // Charge les photos après avoir reçu les utilisateurs
      },
      error: (error) => {
        console.error('Erreur lors du chargement des utilisateurs', error);
      },
    });
  }

  /**
   * Charge l'utilisateur actuellement connecté.
   * Essaie d'abord de récupérer l'utilisateur depuis le service d'authentification,
   */
  loadCurrentUser(): void {
    // D'abord, essaie de récupérer depuis le service d'authentification
    this.authService.loadCurrentUserProfile().subscribe({
      next: (user) => {
        if (user) {
          this.currentUser = user;
          this.loadCurrentUserPhoto();
        } else {
          // Si pas d'utilisateur depuis AuthService, utilise UsersService
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
        // Fallback vers UsersService
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
   *
   * Utilise le service UsersService pour obtenir la photo de l'utilisateur.
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
          // Image par défaut
          this.currentUser!.photoSafeUrl =
            this.sanitizer.bypassSecurityTrustUrl(
              'assets/images/default-avatar.png'
            );
        },
      });
    } else {
      // Si pas de photoUrl, utiliser une image par défaut
      this.currentUser.photoSafeUrl = this.sanitizer.bypassSecurityTrustUrl(
        'assets/images/default-avatar.png'
      );
    }
  }

  /**
   * Retourne le nom complet de l'utilisateur connecté
   * @returns Le nom complet formaté ou un texte par défaut
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
   * @returns Le rôle de l'utilisateur ou un texte par défaut
   */
  getUserRole(): string {
    // Si pas d'utilisateur connecté
    if (!this.currentUser) return 'Rôle non défini';

    // Si l'utilisateur a des rôles
    if (this.currentUser.roles && this.currentUser.roles.length > 0) {
      return this.mapRoleIdToName(this.currentUser.roles[0]);
    }

    // Sinon, utilise le service d'authentification
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

  loadCurrentCentre(): void {
  this.authService.currentUser$.subscribe({
    next: (user) => {
      if (user && user.centreId) {
        this.centreId = user.centreId;
        this.loadVehicleTypes(); // Charger les types de véhicules une fois qu'on a le centreId
      } else {
        this.errorMessage = 'Impossible de déterminer le centre actuel';
        // Optionnel: charger le profil si pas disponible
        this.authService.getCurrentUserProfile().subscribe();
      }
    },
    error: (err) => {
      this.errorMessage = 'Erreur lors de la récupération des informations utilisateur';
      console.error(err);
    }
  });
}

  loadVehicleTypes(): void {
    if (!this.centreId) return;

    this.isLoading = true;
    this.errorMessage = null;

    this.settingsService.getVehicleTypes(this.centreId).subscribe({
      next: (vehicleTypes) => {
        this.vehicleTypes = vehicleTypes;
        this.filteredVehicleTypes = [...vehicleTypes];
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors du chargement des types de véhicules';
        console.error('Erreur:', error);
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

  openAddModal(content: any): void {
    this.isEditMode = false;
    this.currentVehicleTypeId = null;
    this.resetForm();
    this.modalService.open(content, { size: 'lg' });
  }

  openEditModal(content: any, vehicleType: VehicleTypeSetting): void {
    this.isEditMode = true;
    this.currentVehicleTypeId = vehicleType.id;
    this.vehicleTypeForm = { ...vehicleType };
    this.modalService.open(content, { size: 'lg' });
  }

  saveVehicleType(): void {
    if (!this.validateForm()) {
        this.errorMessage = 'Veuillez remplir tous les champs obligatoires correctement.';
        return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    // Créez une nouvelle instance de VehicleTypeSetting
    const vehicleTypeData = new VehicleTypeSetting({
        id: this.currentVehicleTypeId || undefined, // undefined pour les nouvelles créations
        name: this.vehicleTypeForm.name,
        description: this.vehicleTypeForm.description,
        size: this.vehicleTypeForm.size,
        sizeMultiplier: this.vehicleTypeForm.sizeMultiplier,
        sortOrder: this.vehicleTypeForm.sortOrder,
        isActive: this.vehicleTypeForm.isActive,
        iconUrl: this.vehicleTypeForm.iconUrl
    });

    const operation = this.isEditMode && this.currentVehicleTypeId
        ? this.settingsService.updateVehicleType(this.centreId, this.currentVehicleTypeId, vehicleTypeData)
        : this.settingsService.createVehicleType(this.centreId, vehicleTypeData);

    operation.subscribe({
        next: () => {
            this.loadVehicleTypes();
            this.modalService.dismissAll();
            this.isLoading = false;
        },
        error: (error) => {
            this.errorMessage = this.isEditMode
                ? 'Échec de la mise à jour du type de véhicule'
                : 'Échec de la création du type de véhicule';
            console.error('Erreur:', error);
            this.isLoading = false;
        }
    });
}

  toggleVehicleTypeStatus(vehicleType: VehicleTypeSetting): void {
    if (!vehicleType.id) return;

    const confirmMessage = vehicleType.isActive
      ? 'Désactiver ce type de véhicule ?'
      : 'Activer ce type de véhicule ?';

    if (!confirm(confirmMessage)) return;

    this.isLoading = true;
    this.settingsService.toggleVehicleTypeStatus(this.centreId, vehicleType.id).subscribe({
      next: (isActive) => {
        vehicleType.isActive = isActive;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors de la modification du statut';
        console.error('Erreur:', error);
        this.isLoading = false;
      }
    });
  }

  private validateForm(): boolean {
    return (
      !!this.vehicleTypeForm.name &&
      !!this.vehicleTypeForm.size &&
      this.vehicleTypeForm.sizeMultiplier > 0 &&
      this.vehicleTypeForm.sortOrder >= 0
    );
  }

  private resetForm(): void {
    this.vehicleTypeForm = {
      name: '',
      description: '',
      size: VehicleSize.Medium,
      sizeMultiplier: 1.0,
      sortOrder: 0,
      isActive: true,
      iconUrl: 'fas fa-car'
    };
  }



  selectIcon(iconClass: string): void {
    this.vehicleTypeForm.iconUrl = iconClass;
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

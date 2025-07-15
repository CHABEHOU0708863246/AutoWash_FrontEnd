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
import { VehicleSize, VehicleType } from '../../../core/models/Vehicles/VehicleType';

@Component({
  selector: 'app-settings-vehicles',
  imports: [RouterLink, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './settings-vehicles.component.html',
  styleUrl: './settings-vehicles.component.scss',
})
export class SettingsVehiclesComponent implements OnInit {

  VehicleSize = VehicleSize;
  displayedUsers: Users[] = [];
  user: Users | null = null;
  users: Users[] = [];
  currentUser: Users | null = null;
  isLoading: boolean = false;
  errorMessage: string | null = null;
  centreId: string = '';
  isEditMode: boolean = false;
  searchQuery: string = '';
  vehicleTypes: VehicleType[] = [];
  filteredVehicleTypes: VehicleType[] = [];
  vehicleTypeForm: Partial<VehicleType> = {
    label: '',
    size: VehicleSize.Medium,
    defaultSizeMultiplier: 1,
    defaultSortOrder: 0,
    isActive: true,
    isGlobalType: true
  };
  currentVehicleTypeId: string | null = null;

  getSizeIcon(size: VehicleSize): string {
  switch(size) {
    case VehicleSize.Small: return 'fas fa-motorcycle';
    case VehicleSize.Medium: return 'fas fa-car';
    case VehicleSize.Large: return 'fas fa-truck-pickup';
    case VehicleSize.XLarge: return 'fas fa-truck';
    default: return 'fas fa-question';
  }
}

getSizeLabel(size: VehicleSize): string {
  switch(size) {
    case VehicleSize.Small: return 'Petit';
    case VehicleSize.Medium: return 'Moyen';
    case VehicleSize.Large: return 'Grand';
    case VehicleSize.XLarge: return 'Très grand';
    default: return 'Autre';
  }
}

  // Référence au modal ouvert
  private modalRef: NgbModalRef | null = null;

  // Subscription pour éviter les fuites mémoire
  private subscriptions: Subscription = new Subscription();

  // Options pour les formulaires
  vehicleSizes = [
    { value: 'Small', label: 'Petit' },
    { value: 'Medium', label: 'Moyen' },
    { value: 'Large', label: 'Grand' },
    { value: 'XLarge', label: 'Très grand' }
  ];

  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService,
    private router: Router,
    private authService: AuthService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.getUsers();

    const userSub = this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
      }
    });
    this.subscriptions.add(userSub);
  }

  ngOnDestroy(): void {
    // Nettoyer les subscriptions
    this.subscriptions.unsubscribe();
    // Fermer le modal s'il est ouvert
    if (this.modalRef) {
      this.modalRef.dismiss();
    }
  }



  /**
   * Filtre les types de véhicules selon la recherche
   */
  onSearch(): void {
    if (!this.searchQuery) {
      this.filteredVehicleTypes = [...this.vehicleTypes];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredVehicleTypes = this.vehicleTypes.filter(type =>
      type.label.toLowerCase().includes(query) ||
      type.description?.toLowerCase().includes(query) ||
      VehicleSize[type.size].toLowerCase().includes(query)
    );
  }

  /**
   * Réinitialise le formulaire
   */
  resetForm(): void {
    this.vehicleTypeForm = {
      label: '',
      size: VehicleSize.Medium,
      defaultSizeMultiplier: 1,
      defaultSortOrder: 0,
      isActive: true,
      isGlobalType: true,
      description: '',
      iconUrl: ''
    };
    this.currentVehicleTypeId = null;
    this.isEditMode = false;
  }

  /**
   * Ouvre le modal d'ajout
   */
  openAddModal(modal: TemplateRef<any>): void {
    this.resetForm();
    this.isEditMode = false;
    this.modalRef = this.modalService.open(modal, { size: 'lg' });
  }

  /**
   * Ouvre le modal d'édition avec les données pré-remplies
   */
  openEditModal(modal: TemplateRef<any>, vehicleType: VehicleType): void {
    // Vérifier que vehicleType existe et a un ID
    if (!vehicleType || !vehicleType.id) {
      this.errorMessage = 'Impossible de modifier ce type de véhicule';
      return;
    }

    // Activer le mode édition
    this.isEditMode = true;
    this.currentVehicleTypeId = vehicleType.id;

    // Pré-remplir le formulaire avec les données du type de véhicule sélectionné
    this.vehicleTypeForm = {
      label: vehicleType.label || '',
      description: vehicleType.description || '',
      size: vehicleType.size || VehicleSize.Medium,
      defaultSizeMultiplier: vehicleType.defaultSizeMultiplier || 1,
      defaultSortOrder: vehicleType.defaultSortOrder || 0,
      iconUrl: vehicleType.iconUrl || '',
      isActive: vehicleType.isActive !== undefined ? vehicleType.isActive : true,
      isGlobalType: vehicleType.isGlobalType !== undefined ? vehicleType.isGlobalType : true
    };

    // Debug pour vérifier les données
    console.log('Ouverture modal édition:', {
      isEditMode: this.isEditMode,
      currentVehicleTypeId: this.currentVehicleTypeId,
      vehicleTypeForm: this.vehicleTypeForm
    });

    // Ouvrir le modal
    this.modalRef = this.modalService.open(modal, { size: 'lg' });
  }

  /**
   * Sélectionne une icône
   */
  selectIcon(icon: string): void {
    this.vehicleTypeForm.iconUrl = icon;
  }


  // Autres méthodes (loadUserPhotos, getUsers, etc.) restent inchangées...
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

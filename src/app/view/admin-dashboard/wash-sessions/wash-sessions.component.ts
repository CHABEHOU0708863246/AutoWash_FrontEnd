import { Component, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { Users } from '../../../core/models/Users/Users';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { WashSession } from '../../../core/models/Wash/WashSession';
import { Centres } from '../../../core/models/Centres/Centres';
import { WashsService } from '../../../core/services/Washs/washs.service';
import { finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ApiResponseData } from '../../../core/models/ApiResponseData';
import { ServiceSettingsService } from '../../../core/services/ServiceSettings/service-settings.service';
import { VehiclesSettingsService } from '../../../core/services/VehiclesSettings/vehicles-settings.service';
import { ServiceSettings } from '../../../core/models/Settings/Services/ServiceSettings';
import { VehicleTypeSettings } from '../../../core/models/Settings/Vehicles/VehicleTypeSettings';
import { CentresService } from '../../../core/services/Centres/centres.service';

@Component({
  selector: 'app-wash-sessions',
  imports: [ReactiveFormsModule, FormsModule, RouterLink, CommonModule],
  templateUrl: './wash-sessions.component.html',
  styleUrl: './wash-sessions.component.scss',
})
export class WashSessionsComponent implements OnInit {
  users: Users[] = [];
  displayedUsers: Users[] = [];
  currentUser: Users | null = null;
  user: Users | null = null;
  isSidebarCollapsed = false;
  washForm!: FormGroup;
  Math = Math;

  // Propriétés pour la gestion des sessions de lavage
  washSessions: WashSession[] = [];
  filteredSessions: WashSession[] = [];
  isLoading = false;
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  searchTerm = '';
  centres: Centres[] = [];
  selectedCentre = '';

  services: ServiceSettings[] = [];
  vehicleTypes: VehicleTypeSettings[] = [];

  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService,
    private router: Router,
    private authService: AuthService,
    private fb: FormBuilder,
    private washService: WashsService,
    private serviceSettingsService: ServiceSettingsService,
    private centresService: CentresService,
    private vehiclesSettingsService: VehiclesSettingsService
  ) {
    this.washForm = this.fb.group({
      centreId: ['', Validators.required],
      serviceId: ['', Validators.required],
      vehicleTypeId: ['', Validators.required],
      vehiclePlate: ['', [Validators.required, Validators.minLength(4)]],
      vehicleBrand: [''],
      vehicleColor: [''],
      customerPhone: ['', Validators.required],
      customerName: [''],
      transactionId: [''],
      applyLoyaltyDiscount: [false],
      isAdminOverride: [false],
    });
  }

  ngOnInit(): void {
    this.getUsers();
    this.loadCurrentUser();
    this.loadCentres();
    this.loadServices();
    // Charger les sessions après avoir chargé les centres
    setTimeout(() => {
      this.loadWashSessions();
    }, 500);

    this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
      }
    });
  }

  loadServices(): void {
  if (this.selectedCentre) {
    // Utilisez le bon service : serviceSettingsService au lieu de washService
    this.serviceSettingsService.getServicesByCentre(this.selectedCentre).subscribe({
      next: (response: ApiResponseData<ServiceSettings[]>) => {
        if (response.success && response.data) {
          this.services = response.data;
          console.log('Services chargés:', this.services); // Debug
        } else {
          console.warn('Aucun service trouvé pour ce centre');
          this.services = [];
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des services du centre', error);
        this.services = [];
      },
    });
  } else {
    console.warn('Aucun centre sélectionné pour charger les services');
    this.services = [];
  }
}

  getServiceName(serviceId: string): string {
  if (!this.services || this.services.length === 0) {
    return 'Chargement...';
  }

  const service = this.services.find((s) => s.id === serviceId);

  if (!service) {
    console.warn('Service non trouvé pour ID:', serviceId, 'Services disponibles:', this.services);
    return 'Service inconnu';
  }

  return service.name;
}

  // Méthode pour récupérer le nom du centre par ID
  getCentreName(centreId: string): string {
    const centre = this.centres.find((c) => c.id === centreId);
    return centre ? centre.name : 'Centre non trouvé';
  }

  loadCentres(): void {
  this.washService.getActiveCentres().subscribe({
    next: (response) => {
      console.log('Centres response:', response);
      if (response.success && response.data) {
        this.centres = response.data;

        // Si aucun centre n'est sélectionné, prendre le premier
        if (!this.selectedCentre && this.centres.length > 0) {
          this.selectedCentre = this.centres[0].id || '';
          // Charger les services après avoir sélectionné le centre
          this.loadServices();
        }

        // Charger les sessions après avoir les centres
        this.loadWashSessions();
      }
    },
    error: (error) => {
      console.error('Erreur lors du chargement des centres', error);
    },
  });
}

  loadWashSessions(): void {
    this.isLoading = true;
    if (this.selectedCentre) {
      // Chargement par centre (méthode existante)
      this.washService
        .getCompletedWashes(this.selectedCentre)
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: (response) => this.handleWashSessionsResponse(response),
          error: (error) => this.handleWashSessionsError(error),
        });
    } else {
      // Chargement de toutes les sessions
      this.washService
        .getAllWashSessions()
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: (response) => this.handleWashSessionsResponse(response),
          error: (error) => this.handleWashSessionsError(error),
        });
    }
  }

  handleWashSessionsResponse(response: ApiResponseData<WashSession[]>): void {
    if (response.success && response.data) {
      this.washSessions = response.data;
      this.filteredSessions = [...this.washSessions];
      this.totalItems = this.filteredSessions.length;

      // Optionnel: Trier par date (du plus récent au plus ancien)
      this.filteredSessions.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  }

  handleWashSessionsError(error: any): void {
    console.error('Erreur lors du chargement des sessions', error);
  }

  filterByCentre(centreId: string): void {
    this.selectedCentre = centreId;
    this.loadWashSessions();
  }

  // Pagination
  get paginatedSessions(): WashSession[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredSessions.slice(
      startIndex,
      startIndex + this.itemsPerPage
    );
  }

  // Change de page
  pageChanged(page: number): void {
    this.currentPage = page;
  }

  // Ajoutez cette propriété pour calculer le nombre total de pages
get totalPages(): number {
  return Math.ceil(this.totalItems / this.itemsPerPage);
}

// Méthode pour générer les numéros de page avec élipsis
getPages(): (number | string)[] {
  const pages: (number | string)[] = [];
  const maxVisiblePages = 5;

  if (this.totalPages <= maxVisiblePages) {
    // Afficher toutes les pages si moins de maxVisiblePages
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Logique pour les élipsis
    if (this.currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', this.totalPages);
    } else if (this.currentPage >= this.totalPages - 2) {
      pages.push(1, '...', this.totalPages - 3, this.totalPages - 2, this.totalPages - 1, this.totalPages);
    } else {
      pages.push(1, '...', this.currentPage - 1, this.currentPage, this.currentPage + 1, '...', this.totalPages);
    }
  }

  return pages;
}

// Méthode pour changer de page avec validation
goToPage(page: number | string): void {
  if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
    this.currentPage = page;
    this.scrollToTop();
  }
}

// Méthode pour remonter en haut de la liste
private scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

  // Formatte le statut
  getStatusBadge(status: string): string {
    switch (status) {
      case 'Completed':
        return 'bg-success-light text-success';
      case 'Cancelled':
        return 'bg-danger-light text-danger';
      case 'InProgress':
        return 'bg-warning-light text-warning';
      default:
        return 'bg-secondary-light text-secondary';
    }
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
   * Bascule l'état de la barre latérale entre "collapsée" et
   * "étendue".
   * Modifie les classes CSS pour ajuster l'affichage.
   * Cette méthode est appelée lors du clic sur le bouton de
   * basculement de la barre latérale.
   */
  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;

    // Ajoute/retire les classes nécessaires
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    if (sidebar && mainContent) {
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('collapsed');
    }
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

  //#region Authentification
  /**
   * Déconnecte l'utilisateur
   */
  logout(): void {
    if (this.authService.isAuthenticated()) {
      try {
        this.authService.logout();
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

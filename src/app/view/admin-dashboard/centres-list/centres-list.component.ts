import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { Centres } from '../../../core/models/Centres/Centres';
import { Users } from '../../../core/models/Users/Users';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { ConfirmDialogComponent } from "../../../core/components/confirm-dialog/confirm-dialog.component";
import { DomSanitizer } from '@angular/platform-browser';
import { UsersService } from '../../../core/services/Users/users.service';

@Component({
  selector: 'app-centres-list',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, ConfirmDialogComponent],
  templateUrl: './centres-list.component.html',
  styleUrl: './centres-list.component.scss',
})
export class CentresListComponent {
  //#region Variables d'état et données
  // Variables pour la modal d'édition
  showEditModal = false;
  editCentreForm!: FormGroup;
  availableManagers: Users[] = [];
  isSubmitting = false;
  isLoadingCentreData = false;
  currentEditCentreId: string | null = null;
  currentCentreData: Centres | null = null;

  // Données des centres
  centres: Centres[] = [];
  filteredCentre: Centres[] = [];
  displayedCentre: Centres[] = [];

  // Pagination
  currentPage = 1;
  itemsPerPage = 5;
  totalItems = 0;
  totalPages = 0;

  // Utilisateurs
  users: Users[] = [];
  displayedUsers: Users[] = [];
  currentUser: Users | null = null;
  user: Users | null = null;

  // Recherche et état
  searchTerm: string = '';
  isProcessing = false;
  currentCentreId: string | undefined;
  showConfirmDialog = false;

  centreEmployeeCounts: { [centreId: string]: number } = {};

  isSidebarCollapsed = false;

  // Notification
  notification = {
    show: false,
    type: 'success' as 'success' | 'error',
    message: '',
  };
  //#endregion

  //#region Constructeur et initialisation
  constructor(
    private sanitizer: DomSanitizer,
    private router: Router,
    private usersService: UsersService,
    private authService: AuthService,
    private centreService: CentresService,
    private formBuilder: FormBuilder
  ) {
    this.initEditForm();
  }

  ngOnInit(): void {
    this.getCentres();
    this.getUsers();
    this.loadCurrentUser();
    this.loadAvailableManagers();

    this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
      }
    });
  }
  //#endregion

  //#region Gestion des formulaires
  /**
   * Initialise le formulaire d'édition
   */
  initEditForm(): void {
    this.editCentreForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      location: ['', [Validators.required, Validators.minLength(3)]],
      managerId: ['null'],
      isActive: [true]
    });
  }

  /**
   * Marque tous les champs du formulaire comme touchés pour afficher les erreurs
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
  //#endregion

  //#region Gestion des centres
  /**
   * Récupère tous les centres
   */
  getCentres(): void {
    this.centreService.getAllCentres().subscribe({
      next: (data) => {
        this.centres = data;
        this.filteredCentre = data;
        this.totalItems = data.length;
        this.calculateTotalPages();
        this.updateDisplayedCentres();

        // Charger le nombre d'employés pour chaque centre
        this.loadEmployeeCounts();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des centres', error);
      },
    });
  }

  loadEmployeeCounts(): void {
    this.centres.forEach(centre => {
      if (centre.id) {
        this.getEmployeeCountForCentre(centre.id);
      }
    });
  }


  getEmployeeCountForCentre(centreId: string): void {
    this.usersService.getAllUsers().subscribe({
      next: (users) => {
        // Filtrer les utilisateurs qui travaillent dans ce centre et qui ont le rôle "LAVEUR"
        const employeesInCentre = users.filter(user =>
          user.centreId === centreId &&
          user.roles?.some(role => role.toUpperCase() === 'WASHER')
        );
        this.centreEmployeeCounts[centreId] = employeesInCentre.length;
      },
      error: (error) => {
        console.error(`Erreur lors du chargement des employés pour le centre ${centreId}`, error);
        this.centreEmployeeCounts[centreId] = 0;
      }
    });
  }

  getEmployeeCount(centreId: string | undefined): number {
    if (!centreId) return 0;
    return this.centreEmployeeCounts[centreId] || 0;
  }

  /**
   * Exporte les centres au format Excel
   */
  exportCentre(): void {
    this.centreService.exportCentres('xlsx').subscribe(
      (response) => {
        const blob = new Blob([response], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'centres.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      (error) => {
        console.error("Erreur lors de l'exportation des centres", error);
      }
    );
  }

  /**
   * Filtre les centres en fonction du terme de recherche
   */
  filterCentre(): void {
    if (this.searchTerm) {
      this.filteredCentre = this.centres.filter(
        (centre) =>
          (centre.name?.toLowerCase() ?? '').includes(
            this.searchTerm.toLowerCase()
          ) ||
          centre.location
            ?.toLowerCase()
            .includes(this.searchTerm.toLowerCase()) ||
          centre.name?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      this.filteredCentre = this.centres;
    }
    this.totalItems = this.filteredCentre.length;
    this.calculateTotalPages();
    this.updateDisplayedCentres();
  }
  //#endregion

  //#region Gestion des utilisateurs
  /**
   * Charge les photos des utilisateurs
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
   * Récupère tous les utilisateurs
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
   * Charge l'utilisateur actuellement connecté
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
   * Charge la photo de l'utilisateur actuel
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
   * Charge les managers disponibles
   */
  loadAvailableManagers(): void {
    this.centreService.getAvailableManagers().subscribe({
      next: (managers) => {
        this.availableManagers = managers;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des gérants', error);
        this.showNotification('error', 'Erreur lors du chargement des gérants');
      }
    });
  }
  //#endregion

  //#region Méthodes utilitaires
  /**
   * Retourne le nom complet de l'utilisateur
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
   * Retourne le rôle de l'utilisateur
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

  //#region Gestion de la pagination
  /**
   * Calcule le nombre total de pages
   */
  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredCentre.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
  }

  /**
   * Met à jour les centres affichés
   */
  updateDisplayedCentres(): void {
    // Application du filtre de recherche si nécessaire
    let filtered = this.centres;

    if (this.searchTerm.trim()) {
      filtered = this.centres.filter(centre =>
        centre.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        centre.location?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        centre.ownerName?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    this.filteredCentre = filtered;
    this.totalItems = filtered.length;
    this.calculateTotalPages();

    // Pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.displayedCentre = filtered.slice(startIndex, endIndex);
  }

  /**
   * Page précédente
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateDisplayedCentres();
    }
  }

  /**
   * Page suivante
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateDisplayedCentres();
    }
  }

  /**
   * Changement de page
   */
  pageChanged(event: any): void {
    this.currentPage = event;
    this.applyFilter();
  }

  /**
   * Applique le filtre
   */
  applyFilter(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.filteredCentre = this.centres.slice(start, end);
  }
  //#endregion

  //#region Gestion de la modal d'édition
  /**
   * Ouvre la modal d'édition
   */
  editCentre(centreId: string): void {
    if (!centreId) {
      this.showNotification('error', 'ID du centre manquant');
      return;
    }

    this.showEditModal = true;
    this.isLoadingCentreData = true;
    this.currentEditCentreId = centreId;

    const centreFromList = this.centres.find(c => c.id === centreId);

    if (centreFromList) {
      this.populateEditForm(centreFromList);
      this.isLoadingCentreData = false;
      return;
    }

    this.centreService.getCentreById(centreId).subscribe({
      next: (centre) => {
        this.populateEditForm(centre);
        this.isLoadingCentreData = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement du centre', error);
        this.isLoadingCentreData = false;
        this.showNotification('error', 'Erreur lors du chargement des données du centre');
        this.closeEditModal();
      }
    });
  }

  /**
   * Remplit le formulaire d'édition
   */
  private populateEditForm(centre: Centres): void {
    this.currentCentreData = centre;
    this.initEditForm();

    const formData = {
      name: centre.name || '',
      location: centre.location || '',
      managerId: centre.ownerId || '',
      isActive: centre.isActive !== undefined ? centre.isActive : true
    };

    this.editCentreForm.patchValue(formData);
    this.editCentreForm.markAsPristine();
  }

  /**
   * Ferme la modal d'édition
   */
  closeEditModal(): void {
    this.showEditModal = false;
    this.isLoadingCentreData = false;
    this.currentEditCentreId = null;
    this.currentCentreData = null;
    this.editCentreForm.reset();
    this.initEditForm();
  }

  /**
   * Soumet les modifications
   */
  onSubmitEdit(): void {
    if (this.editCentreForm.invalid || !this.currentEditCentreId) {
      this.markFormGroupTouched(this.editCentreForm);
      return;
    }

    this.isSubmitting = true;

    const formData = this.editCentreForm.value;
    const selectedManager = formData.managerId
      ? this.availableManagers.find(manager => manager.id === formData.managerId)
      : null;

    const centreData = {
      name: formData.name,
      location: formData.location,
      ownerId: formData.managerId || null,
      ownerName: selectedManager ? `${selectedManager.firstName} ${selectedManager.lastName}` : null,
      isActive: formData.isActive
    };

    this.centreService.updateCentre(this.currentEditCentreId, centreData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.showNotification('success', 'Centre modifié avec succès');
        this.closeEditModal();

        setTimeout(() => {
          this.getCentres();
        }, 1000);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Erreur lors de la modification', error);
        this.showNotification('error', error.error?.message || 'Erreur lors de la modification du centre');
      }
    });
  }
  //#endregion

  //#region Gestion de la suppression
  /**
   * Prépare la suppression d'un centre
   */
  deleteCentre(centreId: string | undefined): void {
    if (!centreId) {
      console.error('Tentative de suppression sans ID valide');
      this.showNotification('error', 'ID du centre manquant');
      return;
    }

    this.currentCentreId = centreId;
    this.showConfirmDialog = true;
  }

  /**
   * Confirme la suppression
   */
  onConfirmDelete(): void {
    if (!this.currentCentreId) return;

    this.isProcessing = true;
    this.showConfirmDialog = false;

    this.centreService.deleteCentre(this.currentCentreId).subscribe({
      next: () => {
        this.isProcessing = false;
        this.showNotification('success', 'Centre désactivé avec succès');
        setTimeout(() => {
          this.getCentres();
        }, 1500);
      },
      error: (error) => {
        this.isProcessing = false;
        console.error('Erreur lors de la désactivation', error);
        this.showNotification('error', error.error?.message || 'Échec de la désactivation');
      }
    });
  }
  //#endregion

  //#region Gestion des notifications
  /**
   * Affiche une notification
   */
  showNotification(type: 'success' | 'error', message: string): void {
    this.notification = {
      show: true,
      type,
      message,
    };

    setTimeout(() => {
      this.notification.show = false;
    }, 5000);
  }

  /**
   * Masque la notification
   */
  hideNotification(): void {
    this.notification.show = false;
  }
  //#endregion

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

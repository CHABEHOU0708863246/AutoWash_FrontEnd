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
  // Variables pour la modal d'édition
  showEditModal = false;
  editCentreForm!: FormGroup;
  availableManagers: Users[] = [];
  isSubmitting = false;
  isLoadingCentreData = false; // Nouvelle variable pour le loading
  currentEditCentreId: string | null = null;
  currentCentreData: Centres | null = null;

  centres: Centres[] = []; // Liste complète des centres.
  filteredCentre: Centres[] = []; // Liste des centres après filtrage.
  displayedCentre: Centres[] = []; // Liste des centres affichés sur la page actuelle.

  currentPage = 1; // Page actuelle.
  itemsPerPage = 5; // Nombre d'éléments par page.
  totalItems = 0; // Nombre total d'éléments après filtrage.
  totalPages = 0; // Nombre total de pages calculées.

  centre: Centres | null = null; // Informations sur le centre connecté.
  searchTerm: string = ''; // Terme de recherche utilisé pour filtrer les centres.

  isProcessing = false;
  notification = {
    show: false,
    type: 'success' as 'success' | 'error',
    message: '',
  };

  currentCentreId: string | undefined;
  showConfirmDialog = false;
  users: Users[] = []; // Liste complète des utilisateurs.
  displayedUsers: Users[] = []; // Liste des utilisateurs affichés sur la page actuelle.
  currentUser: Users | null = null; // Utilisateur actuellement connecté.
  user: Users | null = null; // Informations sur l'utilisateur connecté.

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

  /**
   * Initialise le formulaire d'édition
   */
  initEditForm(): void {
    this.editCentreForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      location: ['', [Validators.required, Validators.minLength(3)]],
      managerId: ['null'], // Non obligatoire maintenant
      isActive: [true]
    });
  }

  /**
   * Méthode appelée au moment de l'initialisation du composant.
   */
  ngOnInit(): void {
    this.getCentres(); // Récupère les centres.
    this.getUsers(); // Récupère les utilisateurs.
    this.loadCurrentUser(); // Charge l'utilisateur connecté
    this.loadAvailableManagers(); // Charge les managers disponibles

    // S'abonner aux changements de l'utilisateur connecté
    this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
      }
    });
  }

  /**
   * Charge la liste des gérants disponibles
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

/**
 * Ouvre la modal d'édition pour un centre
 */
editCentre(centreId: string): void {
    if (!centreId) {
      this.showNotification('error', 'ID du centre manquant');
      return;
    }

    console.log('Édition du centre avec ID:', centreId);

    // Afficher le modal avec le spinner de chargement
    this.showEditModal = true;
    this.isLoadingCentreData = true;
    this.currentEditCentreId = centreId;

    // D'abord, essayer de récupérer les données depuis la liste locale
    const centreFromList = this.centres.find(c => c.id === centreId);

    if (centreFromList) {
      console.log('Centre trouvé dans la liste locale:', centreFromList);
      this.populateEditForm(centreFromList);
      this.isLoadingCentreData = false;
      return;
    }

    // Si pas trouvé localement, faire un appel API
    this.centreService.getCentreById(centreId).subscribe({
      next: (centre) => {
        console.log('Centre récupéré via API:', centre);
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
 * Remplit le formulaire d'édition avec les données du centre
 */
private populateEditForm(centre: Centres): void {
    this.currentCentreData = centre;

    // Réinitialiser le formulaire
    this.initEditForm();

    // Pré-remplir le formulaire avec les données du centre
    const formData = {
      name: centre.name || '',
      location: centre.location || '',
      managerId: centre.ownerId || '',
      isActive: centre.isActive !== undefined ? centre.isActive : true
    };

    console.log('Données du formulaire:', formData);

    this.editCentreForm.patchValue(formData);

    // Marquer le formulaire comme touché pour déclencher la validation
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
    this.initEditForm(); // Réinitialise le formulaire
  }

/**
 * Soumet les modifications du centre
 */
onSubmitEdit(): void {
    if (this.editCentreForm.invalid || !this.currentEditCentreId) {
      this.markFormGroupTouched(this.editCentreForm);
      return;
    }

    this.isSubmitting = true;

    const formData = this.editCentreForm.value;

    // Trouver le manager sélectionné si un ID est fourni
    const selectedManager = formData.managerId
      ? this.availableManagers.find(manager => manager.id === formData.managerId)
      : null;

    // Construire l'objet de données à envoyer
    const centreData = {
      name: formData.name,
      location: formData.location,
      ownerId: formData.managerId || null, // Peut être null
      ownerName: selectedManager ? `${selectedManager.firstName} ${selectedManager.lastName}` : null,
      isActive: formData.isActive
    };

    console.log('Données à envoyer:', centreData);

    this.centreService.updateCentre(this.currentEditCentreId, centreData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.showNotification('success', 'Centre modifié avec succès');
        this.closeEditModal();

        // Recharger la liste des centres après un délai
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


  /**
   * Marque tous les champs du formulaire comme touchés pour afficher les erreurs
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
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

  /**
   * Filtre les utilisateurs en fonction du terme de recherche.
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
    this.totalItems = this.filteredCentre.length; // Met à jour le nombre total d'éléments filtrés.
    this.calculateTotalPages(); // Calcule le nombre total de pages.
    this.updateDisplayedCentres(); // Met à jour les centres affichés.
  }

  /**
   * Exporte les utilisateurs au format Excel.
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
        a.download = 'centres.xlsx'; // Nom du fichier téléchargé.
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
   * Calcule le nombre total de pages en fonction du nombre d'éléments filtrés.
   */
  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredCentre.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1; // Ajuste la page actuelle si elle dépasse la limite.
    }
  }

  /**
   * Met à jour les centres affichés sur la page actuelle.
   */
  updateDisplayedCentres(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(
      startIndex + this.itemsPerPage,
      this.filteredCentre.length
    );
    this.displayedCentre = this.filteredCentre.slice(startIndex, endIndex);
  }

  /**
   * Navigue vers la page précédente si possible.
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateDisplayedCentres();
    }
  }

  /**
   * Navigue vers la page suivante si possible.
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateDisplayedCentres();
    }
  }

  /**
   * Change la page actuelle en fonction de l'événement reçu.
   */
  pageChanged(event: any): void {
    this.currentPage = event;
    this.applyFilter();
  }

  /**
   * Applique un filtre basé sur la pagination.
   */
  applyFilter(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.filteredCentre = this.centres.slice(start, end);
  }

  getCentres(): void {
    this.centreService.getAllCentres().subscribe({
      next: (data) => {
        this.centres = data;
        this.filteredCentre = data;
        this.totalItems = data.length;
        this.calculateTotalPages();
        this.updateDisplayedCentres();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des utilisateurs', error);
      },
    });
  }

  /**
   * Méthode pour activer un centre
   * @param centreId - L'identifiant du centre à activer
   * @param centreData - Les nouvelles données du centre
   * @returns void
   * */
deleteCentre(centreId: string | undefined): void {
  if (!centreId) {
    console.error('Tentative de suppression sans ID valide');
    this.showNotification('error', 'ID du centre manquant');
    return;
  }

  this.currentCentreId = centreId;
  this.showConfirmDialog = true;
}

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

  // Méthode pour afficher les notifications
  showNotification(type: 'success' | 'error', message: string): void {
    this.notification = {
      show: true,
      type,
      message,
    };

    // Masquer automatiquement après 5 secondes
    setTimeout(() => {
      this.notification.show = false;
    }, 5000);
  }

  // Méthode pour masquer manuellement la notification
  hideNotification(): void {
    this.notification.show = false;
  }

  /**
   * Déconnecte l'utilisateur et le redirige vers la page de connexion.
   */
  logout(): void {
    // Vérifie si l'utilisateur est bien authentifié avant de le déconnecter
    if (this.authService.isAuthenticated()) {
      try {
        // Log l'état du localStorage avant la déconnexion (pour debug)
        console.log('État du localStorage avant déconnexion:', {
          token: !!this.authService.getToken(),
          userRole: localStorage.getItem('userRole'),
          profile: localStorage.getItem('currentUserProfile'),
        });

        // Appel au service de déconnexion
        this.authService.logout();

        // Vérifie que le localStorage a bien été vidé
        console.log('État du localStorage après déconnexion:', {
          token: !!this.authService.getToken(),
          userRole: localStorage.getItem('userRole'),
          profile: localStorage.getItem('currentUserProfile'),
        });

        // Redirige vers la page de login seulement après confirmation que tout est bien déconnecté
        this.router.navigate(['/auth/login']);
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        // Fallback en cas d'erreur - force la redirection
        this.router.navigate(['/auth/login']);
      }
    } else {
      // Si l'utilisateur n'est pas authentifié, rediriger directement
      this.router.navigate(['/auth/login']);
    }
  }


}

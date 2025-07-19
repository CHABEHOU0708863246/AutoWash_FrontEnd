import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { Users } from '../../../core/models/Users/Users';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-users-list',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent {
  // SECTION 1: PROPRIÉTÉS DE CLASSE
  // ====================================================================

  // Liste des utilisateurs
  users: Users[] = [];
  filteredUsers: Users[] = [];
  displayedUsers: Users[] = [];
  currentUser: Users | null = null;

  // États et chargement
  isLoading: boolean = true;

  // Pagination
  currentPage = 1;
  itemsPerPage = 5;
  totalItems = 0;
  totalPages = 0;

  // Recherche
  searchTerm: string = '';

  constructor(
    private router: Router,
    private usersService: UsersService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  // SECTION 2: LIFECYCLE HOOKS
  // ====================================================================

  /**
   * Initialisation du composant
   */
  ngOnInit(): void {
    this.getUsers();
    this.loadCurrentUser();
    this.authService.loadCurrentUserProfile().subscribe({
      next: (user) => {
        if (user) {
          this.currentUser = user;
          this.loadCurrentUserPhoto();
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement du profil utilisateur', error);
      }
    });
    this.authService.currentUser$.subscribe(user => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
      }
    });
  }

  // SECTION 3: GESTION DE L'UTILISATEUR COURANT
  // ====================================================================

  /**
   * Récupère le nom complet de l'utilisateur connecté
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
   * Charge les informations de l'utilisateur connecté
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
              console.error('Erreur lors du chargement de l\'utilisateur connecté', error);
            }
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
            console.error('Erreur lors du chargement de l\'utilisateur connecté', error);
          }
        });
      }
    });
  }

  // SECTION 4: GESTION DES PHOTOS
  // ====================================================================

  /**
   * Charge la photo de l'utilisateur courant
   */
  loadCurrentUserPhoto(): void {
    if (this.currentUser?.photoUrl && typeof this.currentUser.photoUrl === 'string') {
      this.usersService.getUserPhoto(this.currentUser.photoUrl).subscribe({
        next: (blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            this.currentUser!.photoSafeUrl = this.sanitizer.bypassSecurityTrustUrl(
              reader.result as string
            );
          };
          reader.readAsDataURL(blob);
        },
        error: (error) => {
          console.error('Erreur lors du chargement de la photo utilisateur', error);
        }
      });
    }
  }

  /**
   * Charge les photos des utilisateurs affichés
   */
  loadUserPhotos(): void {
    this.displayedUsers.forEach(user => {
      if (user.photoUrl && typeof user.photoUrl === 'string') {
        this.usersService.getUserPhoto(user.photoUrl).subscribe(blob => {
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

  // SECTION 5: GESTION DES UTILISATEURS
  // ====================================================================

  /**
   * Récupère la liste des utilisateurs
   */
  getUsers(): void {
    this.usersService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.filteredUsers = data;
        this.totalItems = data.length;
        this.calculateTotalPages();
        this.updateDisplayedUsers();
        this.loadUserPhotos();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des utilisateurs', error);
      },
    });
  }

  /**
   * Active/désactive un compte utilisateur
   */
  toggleAccount(user: Users): void {
    this.usersService.toggleUserAccount(user.id).subscribe(
      (response) => {
        user.isEnabled = !user.isEnabled;
        console.log(`L'état de l'utilisateur ${user.firstName} a été basculé`);
      },
      (error) => {
        console.error("Erreur lors de la bascule de l'utilisateur", error);
      }
    );
  }

  // SECTION 6: FILTRAGE ET RECHERCHE
  // ====================================================================

  /**
   * Filtre les utilisateurs selon le terme de recherche
   */
  filterUsers(): void {
  if (this.searchTerm) {
    this.filteredUsers = this.users.filter(
      (user) =>
        (user.firstName?.toLowerCase() ?? '').includes(
          this.searchTerm.toLowerCase()
        ) ||
        user.lastName
          ?.toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  } else {
    this.filteredUsers = this.users;
  }
  this.totalItems = this.filteredUsers.length;
  this.calculateTotalPages();
  this.updateDisplayedUsers(); // Cette méthode chargera maintenant automatiquement les photos
}

  /**
   * Applique le filtre de pagination
   */
  applyFilter(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.filteredUsers = this.users.slice(start, end);
  }

  // SECTION 7: PAGINATION
  // ====================================================================

  /**
   * Calcule le nombre total de pages
   */
  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
  }

  /**
   * Met à jour la liste des utilisateurs affichés
   */
  updateDisplayedUsers(): void {
  const startIndex = (this.currentPage - 1) * this.itemsPerPage;
  const endIndex = Math.min(
    startIndex + this.itemsPerPage,
    this.filteredUsers.length
  );
  this.displayedUsers = this.filteredUsers.slice(startIndex, endIndex);
  // Ajoutez cette ligne pour charger les photos à chaque mise à jour
  this.loadUserPhotos();
}

  /**
   * Page précédente
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateDisplayedUsers();
    }
  }

  /**
   * Page suivante
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateDisplayedUsers();
    }
  }

  /**
   * Changement de page
   */
  pageChanged(event: any): void {
    this.currentPage = event;
    this.applyFilter();
  }

  // SECTION 8: EXPORT ET DÉCONNEXION
  // ====================================================================

  /**
   * Exporte les utilisateurs au format Excel
   */
  exportUsers(): void {
    this.usersService.exportUsers('xlsx').subscribe(
      (response) => {
        const blob = new Blob([response], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'utilisateurs.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      (error) => {
        console.error("Erreur lors de l'exportation des utilisateurs", error);
      }
    );
  }

  /**
   * Déconnecte l'utilisateur
   */
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

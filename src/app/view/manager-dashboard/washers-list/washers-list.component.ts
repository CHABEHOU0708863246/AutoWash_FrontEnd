import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { Users } from '../../../core/models/Users/Users';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-washers-list',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './washers-list.component.html',
  styleUrl: './washers-list.component.scss'
})
export class WashersListComponent {
  users: Users[] = []; // Liste complète des washers du manager
  filteredUsers: Users[] = []; // Liste des washers après filtrage
  displayedUsers: Users[] = []; // Liste des washers affichés sur la page actuelle

  currentPage = 1; // Page actuelle
  itemsPerPage = 5; // Nombre d'éléments par page
  totalItems = 0; // Nombre total d'éléments après filtrage
  totalPages = 0; // Nombre total de pages calculées

  currentUser: Users | null = null; // Utilisateur actuellement connecté (le manager)
  searchTerm: string = ''; // Terme de recherche utilisé pour filtrer les washers
  isLoading: boolean = true; // État de chargement

  constructor(
    private sanitizer: DomSanitizer,
    private router: Router,
    private usersService: UsersService,
    private authService: AuthService
  ) {}

  /**
   * Méthode appelée au moment de l'initialisation du composant
   */
  ngOnInit(): void {
    this.initializeComponent();
  }

  /**
   * Initialisation centralisée du composant
   */
  private initializeComponent(): void {
    this.isLoading = true;

    // Chargement séquentiel avec gestion d'erreur
    this.loadCurrentUserAndWashers().subscribe({
      next: () => {
        this.isLoading = false;
        this.initializePagination();
      },
      error: (error: any) => {
        console.error('Erreur lors de l\'initialisation du composant', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Charge l'utilisateur courant puis ses washers
   */
  private loadCurrentUserAndWashers(): Observable<any> {
    return this.loadCurrentUser().pipe(
      switchMap((user: Users | null) => this.getManagerWashers())
    );
  }

  /**
   * Charge l'utilisateur courant avec gestion d'erreur améliorée
   */
  private loadCurrentUser(): Observable<Users | null> {
    return this.authService.loadCurrentUserProfile().pipe(
      catchError((error: any) => {
        console.error('Erreur AuthService, fallback vers UsersService', error);
        return this.usersService.getCurrentUser();
      }),
      switchMap((user: Users | null) => {
        if (user) {
          this.currentUser = user;
          return this.loadCurrentUserPhoto().pipe(
            switchMap(() => of(user))
          );
        }
        return of(null);
      }),
      catchError((error: any) => {
        console.error('Erreur critique lors du chargement de l\'utilisateur', error);
        return of(null);
      })
    );
  }

  /**
   * Récupère uniquement les washers du manager connecté
   */
getManagerWashers(): Observable<Users[]> {
  // Vérifier que l'utilisateur est bien un manager
  if (!this.isManager()) {
    console.warn('L\'utilisateur n\'est pas un manager, accès refusé');
    this.users = [];
    return of([]);
  }

  // Récupérer le centre du manager
  const managerCentreId = this.currentUser?.centreId;
  console.log('Centre du manager:', managerCentreId);

  // OPTION A : Si pas de centre, afficher tous les washers (manager global)
  // OPTION B : Si pas de centre, ne rien afficher
  // OPTION C : Rediriger vers une page d'assignation de centre

  if (!managerCentreId) {
    console.warn('Manager sans centre assigné');

    // OPTION A - Manager global : voir tous les washers
    return this.usersService.getAllUsers().pipe(
      switchMap((allUsers: Users[]) => {
        console.log('Tous les utilisateurs récupérés:', allUsers.length);

        // Filtrer pour ne garder que les washers
        this.users = allUsers.filter(user => {
          const isWasher = this.isUserWasher(user);
          console.log(`User ${user.firstName}: rôle=${this.getUserRoleName(user)}, isWasher=${isWasher}`);
          return isWasher;
        });

        console.log('Washers filtrés (tous centres):', this.users.length);
        return this.loadAllWashersPhotos();
      }),
      catchError((error: any) => {
        console.error('Erreur lors de la récupération des washers', error);
        this.users = [];
        return of([]);
      })
    );

    /*
    // OPTION B - Ne rien afficher
    console.error('Ce manager doit être assigné à un centre');
    alert('Votre compte n\'est pas encore assigné à un centre. Veuillez contacter l\'administrateur.');
    this.users = [];
    return of([]);
    */

    /*
    // OPTION C - Redirection
    alert('Votre compte doit être assigné à un centre');
    this.router.navigate(['/settings/profile']);
    this.users = [];
    return of([]);
    */
  }

  // Si le manager a un centre, filtrer par centre
  return this.usersService.getAllUsers().pipe(
    switchMap((allUsers: Users[]) => {
      console.log('Tous les utilisateurs récupérés:', allUsers.length);

      // Filtrer pour ne garder que les washers du centre du manager
      this.users = allUsers.filter(user => {
        const isWasher = this.isUserWasher(user);
        const sameCentre = user.centreId === managerCentreId;
        console.log(`User ${user.firstName}: centre=${user.centreId}, rôle=${this.getUserRoleName(user)}, isWasher=${isWasher}, sameCentre=${sameCentre}`);
        return isWasher && sameCentre;
      });

      console.log('Washers filtrés:', this.users.length);
      return this.loadAllWashersPhotos();
    }),
    catchError((error: any) => {
      console.error('Erreur lors de la récupération des washers', error);
      this.users = [];
      return of([]);
    })
  );
}

  /**
   * Vérifie si l'utilisateur est un washer du centre du manager
   */
  isWasherFromManagerCentre(user: Users, managerCentreId: string): boolean {
  // Vérifier le rôle (washer) - adapter selon votre structure de rôles
  const isWasher = this.isUserWasher(user);

  // Vérifier qu'il appartient au même centre que le manager
  const sameCentre = user.centreId === managerCentreId;

  return isWasher && sameCentre;
}

/**
 * Vérifie si l'utilisateur a le rôle washer
 */
isUserWasher(user: Users): boolean {
  if (!user.roles || user.roles.length === 0) {
    return false;
  }

  const userRole = this.getUserRoleName(user).toLowerCase();
  return userRole === 'washer' || userRole === 'laveur';
}



  /**
 * Vérifie si l'utilisateur connecté est un manager
 */
private isManager(): boolean {
  if (!this.currentUser) return false;

  const userRole = this.getUserRoleName(this.currentUser).toLowerCase();
  console.log('Rôle détecté:', userRole, 'pour l\'utilisateur:', this.currentUser);
  return userRole === 'manager' || userRole === 'gérant';
}

  /**
   * Charge les photos de tous les washers
   */
  private loadAllWashersPhotos(): Observable<any[]> {
    if (this.users.length === 0) {
      return of([]);
    }

    const photoRequests = this.users
      .filter(user => user.photoUrl && typeof user.photoUrl === 'string')
      .map(user =>
        this.usersService.getUserPhoto(user.photoUrl as string).pipe(
          catchError((error: any) => {
            console.error(`Erreur photo pour ${user.firstName}`, error);
            return of(null);
          })
        )
      );

    if (photoRequests.length === 0) {
      return of([]);
    }

    return forkJoin(photoRequests).pipe(
      switchMap((blobs: (Blob | null)[]) => {
        blobs.forEach((blob, index) => {
          if (blob) {
            this.loadUserPhotoSafeUrl(this.users[index], blob);
          }
        });
        return of(blobs);
      })
    );
  }

  /**
   * Charge une photo utilisateur de manière sécurisée
   */
  private loadUserPhotoSafeUrl(user: Users, blob: Blob): void {
    const reader = new FileReader();
    reader.onload = () => {
      user.photoSafeUrl = this.sanitizer.bypassSecurityTrustUrl(
        reader.result as string
      );
    };
    reader.readAsDataURL(blob);
  }

  /**
   * Charge la photo de l'utilisateur actuellement connecté
   */
  private loadCurrentUserPhoto(): Observable<void> {
  return new Observable(observer => {
    if (!this.currentUser) {
      observer.next();
      observer.complete();
      return;
    }

    if (this.currentUser.photoUrl && typeof this.currentUser.photoUrl === 'string') {
      this.usersService.getUserPhoto(this.currentUser.photoUrl).subscribe({
        next: (blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            this.currentUser!.photoSafeUrl =
              this.sanitizer.bypassSecurityTrustUrl(reader.result as string);
            observer.next();
            observer.complete();
          };
          reader.readAsDataURL(blob);
        },
        error: (error) => {
          console.error('Erreur lors du chargement de la photo utilisateur', error);
          this.setDefaultUserPhoto();
          observer.next();
          observer.complete();
        },
      });
    } else {
      this.setDefaultUserPhoto();
      observer.next();
      observer.complete();
    }
  });
}

  /**
   * Définit une photo par défaut pour l'utilisateur courant
   */
  private setDefaultUserPhoto(): void {
    if (this.currentUser) {
      this.currentUser.photoSafeUrl = this.sanitizer.bypassSecurityTrustUrl(
        'assets/images/default-avatar.png'
      );
    }
  }

  /**
   * Initialise la pagination
   */
  private initializePagination(): void {
    this.filteredUsers = [...this.users];
    this.totalItems = this.filteredUsers.length;
    this.calculateTotalPages();
    this.updateDisplayedUsers();
  }

  //#region MÉTHODES PUBLIQUES

  /**
   * Retourne le nom complet de l'utilisateur connecté
   */
  getFullName(): string {
    if (this.currentUser) {
      const firstName = this.currentUser.firstName || '';
      const lastName = this.currentUser.lastName || '';
      return `${firstName} ${lastName}`.trim() || 'Manager';
    }
    return 'Manager';
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
    return role ? this.mapRoleIdToName(role) : 'Manager';
  }

  /**
 * Retourne le nom du rôle d'un utilisateur
 */
getUserRoleName(user: Users): string {
  if (user.roles && user.roles.length > 0) {
    return this.mapRoleIdToName(user.roles[0]);
  }
  return 'Rôle inconnu';
}

private mapRoleIdToName(roleId: any): string {
  let roleString: string;

  if (typeof roleId === 'string') {
    roleString = roleId;
  } else if (roleId && typeof roleId === 'object' && roleId.$oid) {
    roleString = roleId.$oid;
  } else {
    return 'Rôle inconnu';
  }

  const roleMapping: { [key: string]: string } = {
    // IDs de rôles (à adapter selon votre base de données)
    '68d92acc0838460ccb3fa6d8': 'Manager', // ID du rôle Manager
    '68d92acc0838460ccb3fa6d7': 'Administrateur', // Exemple
    '68d92acc0838460ccb3fa6d9': 'Washer', // Exemple

    // Noms de rôles normalisés
    'admin': 'Administrateur',
    'administrateur': 'Administrateur',
    'manager': 'Manager',
    'gérant': 'Manager',
    'washer': 'Washer',
    'laveur': 'Washer',
    'editor': 'Éditeur',
    'éditeur': 'Éditeur',

    // IDs numériques (si utilisés)
    '1': 'Administrateur',
    '2': 'Manager',
    '3': 'Éditeur',
    '4': 'Washer'
  };

  return roleMapping[roleString] || roleMapping[roleString.toLowerCase()] || roleString;
}

  /**
   * Filtre les washers en fonction du terme de recherche
   */
  filterUsers(): void {
    if (this.searchTerm) {
      this.filteredUsers = this.users.filter(
        (user) =>
          (user.firstName?.toLowerCase() ?? '').includes(
            this.searchTerm.toLowerCase()
          ) ||
          user.lastName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      this.filteredUsers = [...this.users];
    }
    this.totalItems = this.filteredUsers.length;
    this.calculateTotalPages();
    this.updateDisplayedUsers();
  }

  /**
   * Bascule l'état du compte washer
   */
  toggleAccount(user: Users): void {
    if (!this.canManageWasher(user)) {
      console.warn('Tentative non autorisée de modification du washer');
      return;
    }

    this.usersService.toggleUserAccount(user.id).subscribe({
      next: () => {
        user.isEnabled = !user.isEnabled;
        console.log(`État du washer ${user.firstName} basculé`);
      },
      error: (error: any) => {
        console.error("Erreur lors de la bascule du washer", error);
      }
    });
  }

  /**
   * Vérifie si le manager peut gérer ce washer
   */
  canManageWasher(washer: Users): boolean {
    if (!this.currentUser || !this.isManager()) return false;

    // Un manager ne peut gérer que les washers de son centre
    return washer.centreId === this.currentUser.centreId;
  }

  /**
   * Exporte les washers au format Excel
   */
  exportUsers(): void {
    if (this.users.length === 0) {
      console.warn('Aucun washer à exporter');
      return;
    }

    this.usersService.exportUsers('xlsx').subscribe({
      next: (response: Blob) => {
        const blob = new Blob([response], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `washers-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error: any) => {
        console.error("Erreur lors de l'exportation des washers", error);
      }
    });
  }

  //#region PAGINATION

  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
  }

  updateDisplayedUsers(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(
      startIndex + this.itemsPerPage,
      this.filteredUsers.length
    );
    this.displayedUsers = this.filteredUsers.slice(startIndex, endIndex);
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateDisplayedUsers();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateDisplayedUsers();
    }
  }

  pageChanged(event: any): void {
    this.currentPage = event;
    this.applyFilter();
  }

  applyFilter(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.filteredUsers = this.users.slice(start, end);
  }

  //#endregion

  /**
   * Déconnecte l'utilisateur
   */
  logout(): void {
    if (this.authService.isAuthenticated()) {
      try {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
      } catch (error: any) {
        console.error('Erreur lors de la déconnexion:', error);
        this.router.navigate(['/auth/login']);
      }
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  //#endregion
}

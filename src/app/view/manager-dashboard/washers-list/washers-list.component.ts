import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { Users } from '../../../core/models/Users/Users';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-washers-list',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './washers-list.component.html',
  styleUrl: './washers-list.component.scss'
})
export class WashersListComponent {
  users: Users[] = []; // Liste complète des utilisateurs.
  filteredUsers: Users[] = []; // Liste des utilisateurs après filtrage.
  displayedUsers: Users[] = []; // Liste des utilisateurs affichés sur la page actuelle.

  currentPage = 1; // Page actuelle.
  itemsPerPage = 5; // Nombre d'éléments par page.
  totalItems = 0; // Nombre total d'éléments après filtrage.
  totalPages = 0; // Nombre total de pages calculées.

  user: Users | null = null; // Informations sur l'utilisateur connecté.
  searchTerm: string = ''; // Terme de recherche utilisé pour filtrer les utilisateurs.


constructor(
    private router: Router, // Service pour la navigation entre les routes.
    private usersService: UsersService, // Service pour interagir avec les utilisateurs.
    private authService: AuthService // Service pour gérer l'authentification.
  ) {}

   /**
   * Méthode appelée au moment de l'initialisation du composant.
   */
  ngOnInit(): void {
    this.getUsers(); // Récupère les utilisateurs.
  }

  /**
   * Filtre les utilisateurs en fonction du terme de recherche.
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
    this.totalItems = this.filteredUsers.length; // Met à jour le nombre total d'éléments filtrés.
    this.calculateTotalPages(); // Calcule le nombre total de pages.
    this.updateDisplayedUsers(); // Met à jour les utilisateurs affichés.
  }

  /**
   * Exporte les utilisateurs au format Excel.
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
        a.download = 'utilisateurs.xlsx'; // Nom du fichier téléchargé.
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
   * Calcule le nombre total de pages en fonction du nombre d'éléments filtrés.
   */
  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1; // Ajuste la page actuelle si elle dépasse la limite.
    }
  }

  /**
   * Met à jour les utilisateurs affichés sur la page actuelle.
   */
  updateDisplayedUsers(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(
      startIndex + this.itemsPerPage,
      this.filteredUsers.length
    );
    this.displayedUsers = this.filteredUsers.slice(startIndex, endIndex);
  }

  /**
   * Navigue vers la page précédente si possible.
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateDisplayedUsers();
    }
  }

  /**
   * Navigue vers la page suivante si possible.
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateDisplayedUsers();
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
    this.filteredUsers = this.users.slice(start, end);
  }

  getUsers(): void {
    this.usersService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.filteredUsers = data;
        this.totalItems = data.length;
        this.calculateTotalPages();
        this.updateDisplayedUsers();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des utilisateurs', error);
      },
    });
  }

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
          profile: localStorage.getItem('currentUserProfile')
        });

        // Appel au service de déconnexion
        this.authService.logout();

        // Vérifie que le localStorage a bien été vidé
        console.log('État du localStorage après déconnexion:', {
          token: !!this.authService.getToken(),
          userRole: localStorage.getItem('userRole'),
          profile: localStorage.getItem('currentUserProfile')
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

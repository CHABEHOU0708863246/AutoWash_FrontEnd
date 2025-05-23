import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { Centres } from '../../../core/models/Centres/Centres';
import { Users } from '../../../core/models/Users/Users';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { ConfirmDialogComponent } from "../../../core/components/confirm-dialog/confirm-dialog.component";

@Component({
  selector: 'app-centres-list',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, ConfirmDialogComponent],
  templateUrl: './centres-list.component.html',
  styleUrl: './centres-list.component.scss',
})
export class CentresListComponent {
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

  constructor(
    private router: Router, // Service pour la navigation entre les routes.
    private authService: AuthService, // Service pour gérer l'authentification.
    private centreService: CentresService // Service pour interagir avec les centres.
  ) {}

  /**
   * Méthode appelée au moment de l'initialisation du composant.
   */
  ngOnInit(): void {
    this.getCentres(); // Récupère les centres.
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

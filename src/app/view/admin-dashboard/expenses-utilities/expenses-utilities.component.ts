import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { Users } from '../../../core/models/Users/Users';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { Expense } from '../../../core/models/Expenses/Expense';
import { ExpenseRequest } from '../../../core/models/Expenses/ExpenseRequest';
import { ExpensesService } from '../../../core/services/Expenses/expenses.service';
import { FormsModule } from '@angular/forms';
import { ApiResponseData } from '../../../core/models/ApiResponseData';
import { Centres } from '../../../core/models/Centres/Centres';
import { PaginatedResponse } from '../../../core/models/Paginate/PaginatedResponse';
import { CentresService } from '../../../core/services/Centres/centres.service';

@Component({
  selector: 'app-expenses-utilities',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './expenses-utilities.component.html',
  styleUrl: './expenses-utilities.component.scss'
})
export class ExpensesUtilitiesComponent implements OnInit {
  users: Users[] = []; // Liste complète des utilisateurs.
  displayedUsers: Users[] = []; // Liste des utilisateurs affichés sur la page actuelle.
  currentUser: Users | null = null; // Utilisateur actuellement connecté.
  user: Users | null = null; // Informations sur l'utilisateur connecté.
  isSidebarCollapsed = false;

  // Propriétés pour la gestion des dépenses
  expenses: Expense[] = [];
  loading = false;
  submitting = false;
  expenseTypes: string[] = [];
  centres: Centres[] = [];

  // Filtres
  selectedCentreId: string = '';
  selectedType: string = '';

  // Formulaire modèle
  expenseForm: ExpenseRequest = {
    type: '',
    description: '',
    amount: 0,
    date: new Date(),
    centreId: ''
  };

 constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService,
    private router: Router,
    private authService: AuthService,
    private expensesService: ExpensesService,
    private centresService: CentresService
  ) {}

  ngOnInit(): void {
    this.getUsers();
    this.loadCurrentUser();
    this.loadCentres();

    this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
        // Une fois l'utilisateur chargé, charger les données
        if (this.currentUser?.centreId) {
          this.selectedCentreId = this.currentUser.centreId;
          this.expenseForm.centreId = this.currentUser.centreId;
          this.loadExpenseTypes();
          this.loadExpenses();
        }
      }
    });
  }

  // Charger tous les centres
  loadCentres(): void {
    this.centresService.getAllCentres()
      .subscribe({
        next: (centres) => {
          this.centres = centres;
          // Sélectionner le centre de l'utilisateur par défaut si disponible
          if (this.currentUser?.centreId && !this.selectedCentreId) {
            this.selectedCentreId = this.currentUser.centreId;
            this.expenseForm.centreId = this.currentUser.centreId;
            this.loadExpenseTypes();
            this.loadExpenses();
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement des centres:', error);
        }
      });
  }


  loadExpenseTypes(): void {
    if (this.selectedCentreId) { // Utiliser selectedCentreId au lieu de currentUser.centreId
      console.log('Chargement des types pour le centre:', this.selectedCentreId);

      this.expensesService.getExpenseTypes(this.selectedCentreId)
        .subscribe({
          next: (response) => {
            console.log('Réponse des types:', response);

            // CORRECTION: Utiliser response.succeeded au lieu de response.success
            if (response.success) {
              this.expenseTypes = response.data;
              console.log('Types chargés:', this.expenseTypes);
            } else {
              console.error('Erreur lors du chargement des types:', response.message);
              // Types par défaut en cas d'erreur
              this.expenseTypes = [
                "Eau/Électricité",
                "Produits",
                "Nourriture",
                "Maintenance",
                "Personnel",
                "Transport",
                "Marketing",
                "Assurance",
                "Taxes",
                "Autres"
              ];
            }
          },
          error: (error) => {
            console.error('Erreur API lors du chargement des types:', error);
            // Types par défaut en cas d'erreur
            this.expenseTypes = [
              "Eau/Électricité",
              "Produits",
              "Nourriture",
              "Maintenance",
              "Personnel",
              "Transport",
              "Marketing",
              "Assurance",
              "Taxes",
              "Autres"
            ];
          }
        });
    } else {
      console.warn('Aucun centre sélectionné pour charger les types');
    }
  }

  // Charger les dépenses
  loadExpenses(): void {
    if (this.selectedCentreId) {
      this.loading = true;

      // Appliquer les filtres en fonction des sélections
      if (this.selectedType) {
        // Filtrer par type
        this.expensesService.getExpensesByType(this.selectedCentreId, this.selectedType, 1, 50)
          .subscribe({
            next: (response) => {
              this.handleExpensesResponse(response);
            },
            error: (error) => {
              this.handleExpensesError(error);
            }
          });
      } else {
        // Toutes les dépenses du centre
        this.expensesService.getExpensesByCentre(this.selectedCentreId, 1, 50)
          .subscribe({
            next: (response) => {
              this.handleExpensesResponse(response);
            },
            error: (error) => {
              this.handleExpensesError(error);
            }
          });
      }
    }
  }

  // Gérer la réponse des dépenses
  private handleExpensesResponse(response: ApiResponseData<PaginatedResponse<Expense>>): void {
    if (response.success) {
      this.expenses = response.data.items;
    } else {
      console.error('Erreur:', response.message);
      this.expenses = [];
    }
    this.loading = false;
  }

  // Gérer les erreurs de chargement des dépenses
  private handleExpensesError(error: any): void {
    console.error('Erreur API:', error);
    this.expenses = [];
    this.loading = false;
  }

  // Lorsque les filtres changent
  onFiltersChange(): void {
    this.loadExpenseTypes();
    this.loadExpenses();
  }

  // Lorsque le centre sélectionné change
  onCentreChange(): void {
    this.expenseForm.centreId = this.selectedCentreId;
    this.onFiltersChange();
  }

  // Lorsque le type sélectionné change
  onTypeChange(): void {
    this.onFiltersChange();
  }

  // Réinitialiser les filtres
  resetFilters(): void {
    this.selectedType = '';
    this.onFiltersChange();
  }

  onSubmit(): void {
    if (!this.isFormValid()) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.submitting = true;

    this.expensesService.createExpense(this.expenseForm)
      .subscribe({
        next: (response) => {
          if (response.success) {
            alert('Dépense enregistrée avec succès!');
            this.resetForm();
            this.loadExpenses(); // Recharger la liste avec les filtres actuels
          } else {
            alert('Erreur: ' + response.message);
          }
          this.submitting = false;
        },
        error: (error) => {
          console.error('Erreur API:', error);
          alert('Une erreur est survenue lors de l\'enregistrement');
          this.submitting = false;
        }
      });
  }



  // Valider le formulaire
  isFormValid(): boolean {
    return !!this.expenseForm.type &&
           !!this.expenseForm.centreId &&
           !!this.expenseForm.description &&
           this.expenseForm.amount > 0 &&
           !!this.expenseForm.date;
  }

  // Réinitialiser le formulaire
  resetForm(): void {
    this.expenseForm = {
      type: '',
      description: '',
      amount: 0,
      date: new Date(),
      centreId: ''
    };
  }

  // Calculer le total des montants
getTotalAmount(): number {
  return this.expenses.reduce((total, expense) => total + expense.amount, 0);
}

  // Formater le montant
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  }

  // Formater la date
  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('fr-FR').format(dateObj);
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

  /**
   * Déconnecte l'utilisateur et le redirige vers la page de connexion.
   */
  logout(): void {
    // Vérifie si l'utilisateur est bien authentifié avant de le déconnecter
    if (this.authService.isAuthenticated()) {
      try {
        // Log l'état du localStorage avant la déconnexion (pour debug)
        console.log('État du localStorage avant déconnexion:', {
        });

        // Appel au service de déconnexion
        this.authService.logout();

        // Vérifie que le localStorage a bien été vidé
        console.log('État du localStorage après déconnexion:', {

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


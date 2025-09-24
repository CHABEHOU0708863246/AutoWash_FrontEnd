import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Models
import { Users } from '../../../core/models/Users/Users';
import { Expense } from '../../../core/models/Expenses/Expense';
import { ExpenseRequest } from '../../../core/models/Expenses/ExpenseRequest';
import { ApiResponseData } from '../../../core/models/ApiResponseData';
import { Centres } from '../../../core/models/Centres/Centres';
import { PaginatedResponse } from '../../../core/models/Paginate/PaginatedResponse';

// Services
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { ExpensesService } from '../../../core/services/Expenses/expenses.service';
import { CentresService } from '../../../core/services/Centres/centres.service';

@Component({
  selector: 'app-expenses-utilities',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './expenses-utilities.component.html',
  styleUrl: './expenses-utilities.component.scss'
})
export class ExpensesUtilitiesComponent implements OnInit {
  //#region Properties
  // Propriétés utilisateurs
  users: Users[] = [];
  displayedUsers: Users[] = [];
  currentUser: Users | null = null;
  user: Users | null = null;
  isSidebarCollapsed = false;

  // Propriétés dépenses
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
  //#endregion

  //#region Constructor
  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService,
    private router: Router,
    private authService: AuthService,
    private expensesService: ExpensesService,
    private centresService: CentresService
  ) {}
  //#endregion

  //#region Lifecycle Methods
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
  //#endregion

  //#region Centres Methods
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
  //#endregion

  //#region Expense Types Methods
  loadExpenseTypes(): void {
    if (this.selectedCentreId) {
      console.log('Chargement des types pour le centre:', this.selectedCentreId);

      this.expensesService.getExpenseTypes(this.selectedCentreId)
        .subscribe({
          next: (response) => {
            console.log('Réponse des types:', response);

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
  //#endregion

  //#region Expenses Methods
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

  private handleExpensesResponse(response: ApiResponseData<PaginatedResponse<Expense>>): void {
    if (response.success) {
      this.expenses = response.data.items;
    } else {
      console.error('Erreur:', response.message);
      this.expenses = [];
    }
    this.loading = false;
  }

  private handleExpensesError(error: any): void {
    console.error('Erreur API:', error);
    this.expenses = [];
    this.loading = false;
  }

  getTotalAmount(): number {
    return this.expenses.reduce((total, expense) => total + expense.amount, 0);
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  }

  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('fr-FR').format(dateObj);
  }
  //#endregion

  //#region Filter Methods
  onFiltersChange(): void {
    this.loadExpenseTypes();
    this.loadExpenses();
  }

  onCentreChange(): void {
    this.expenseForm.centreId = this.selectedCentreId;
    this.onFiltersChange();
  }

  onTypeChange(): void {
    this.onFiltersChange();
  }

  resetFilters(): void {
    this.selectedType = '';
    this.onFiltersChange();
  }
  //#endregion

  //#region Form Methods
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
            this.loadExpenses();
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

  isFormValid(): boolean {
    return !!this.expenseForm.type &&
           !!this.expenseForm.centreId &&
           !!this.expenseForm.description &&
           this.expenseForm.amount > 0 &&
           !!this.expenseForm.date;
  }

  resetForm(): void {
    this.expenseForm = {
      type: '',
      description: '',
      amount: 0,
      date: new Date(),
      centreId: ''
    };
  }
  //#endregion

  //#region User Methods
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

    if (this.currentUser.photoUrl && typeof this.currentUser.photoUrl === 'string') {
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
          console.error('Erreur lors du chargement de la photo utilisateur', error);
          this.currentUser!.photoSafeUrl =
            this.sanitizer.bypassSecurityTrustUrl('assets/images/default-avatar.png');
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

  //#region UI Methods
  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;

    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    if (sidebar && mainContent) {
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('collapsed');
    }
  }
  //#endregion

  //#region Auth Methods
  logout(): void {
    if (this.authService.isAuthenticated()) {
      try {
        console.log('État du localStorage avant déconnexion:', {});

        this.authService.logout();

        console.log('État du localStorage après déconnexion:', {});

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

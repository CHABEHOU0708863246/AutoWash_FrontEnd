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
import { NotificationService } from '../../../core/services/Notification/notification.service'; // Import ajouté

interface ExpenseStats {
  totalMensuel: number;
  totalAnnuel: number;
  moyenneMensuelle: number;
  depensesParType: { [key: string]: number };
  depensesMensuelles: { [key: string]: number };
}

@Component({
  selector: 'app-expenses-utilities',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './expenses-utilities.component.html',
  styleUrl: './expenses-utilities.component.scss',
})
export class ExpensesUtilitiesComponent implements OnInit {
  //#region Properties
  // Propriétés utilisateurs
  users: Users[] = [];
  displayedUsers: Users[] = [];
  currentUser: Users | null = null;
  user: Users | null = null;
  isSidebarCollapsed = false;

  // Suppression des anciennes propriétés de notification
  // showSuccessPopup: boolean = false;
  // successMessage: string = '';

  showDeleteConfirmation: boolean = false;
  expenseToDelete: Expense | null = null;

  isEditMode: boolean = false;
  editingExpenseId: string | null = null;

  // Propriétés dépenses
  expenses: Expense[] = [];
  loading = false;
  submitting = false;
  expenseTypes: string[] = [];
  centres: Centres[] = [];

  // Statistiques
  expenseStats: ExpenseStats = {
    totalMensuel: 0,
    totalAnnuel: 0,
    moyenneMensuelle: 0,
    depensesParType: {},
    depensesMensuelles: {},
  };

  // Filtres
  selectedCentreId: string = '';
  selectedType: string = '';

  // Formulaire modèle
  expenseForm: ExpenseRequest = {
    type: '',
    description: '',
    amount: 0,
    date: new Date(),
    centreId: '',
  };

  // Navigation entre vues
  activeView: 'cards' | 'grid' | 'form' = 'cards';
  //#endregion

  //#region Constructor
  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService,
    private router: Router,
    private authService: AuthService,
    private expensesService: ExpensesService,
    private centresService: CentresService,
    private notificationService: NotificationService // Injection du service
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

  //#region Edit & Delete Methods

  /**
   * Préparer le formulaire pour modifier une dépense
   */
  editExpense(expense: Expense): void {
    this.isEditMode = true;
    this.editingExpenseId = expense.id?.toString() || null;

    // Remplir le formulaire avec les données de la dépense
    this.expenseForm = {
      type: expense.type,
      description: expense.description,
      amount: expense.amount,
      date: new Date(expense.date),
      centreId: expense.centreId,
    };

    // Basculer vers la vue formulaire
    this.switchView('form');
  }

  /**
   * Demander confirmation avant de supprimer
   */
  confirmDeleteExpense(expense: Expense): void {
    const confirmation = confirm(
      `Êtes-vous sûr de vouloir supprimer cette dépense ?\n\n` +
        `Type: ${expense.type}\n` +
        `Description: ${expense.description}\n` +
        `Montant: ${this.formatAmount(expense.amount)}\n` +
        `Date: ${this.formatDate(expense.date)}`
    );

    if (confirmation) {
      this.deleteExpense(expense.id?.toString() || '');
    }
  }

  /**
   * Supprimer une dépense
   */
  deleteExpense(expenseId: string): void {
    this.loading = true;

    this.expensesService.deleteExpense(expenseId).subscribe({
      next: (response) => {
        this.notificationService.success(
          'Succès',
          'Dépense supprimée avec succès!'
        );
        this.loadExpenses();
      },
      error: (error) => {
        console.error('Erreur lors de la suppression:', error);
        this.notificationService.error(
          'Erreur',
          'Une erreur est survenue lors de la suppression de la dépense.'
        );
        this.loading = false;
      },
    });
  }

  //#endregion

  //#region Centres Methods
  loadCentres(): void {
    this.centresService.getAllCentres().subscribe({
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
        this.notificationService.error(
          'Erreur',
          'Impossible de charger les centres'
        );
      },
    });
  }
  //#endregion

  //#region Expense Types Methods
  loadExpenseTypes(): void {
    if (this.selectedCentreId) {
      this.expensesService.getExpenseTypes(this.selectedCentreId).subscribe({
        next: (response) => {
          if (response.success) {
            this.expenseTypes = response.data;
          } else {
            console.error(
              'Erreur lors du chargement des types:',
              response.message
            );
            this.loadDefaultExpenseTypes();
            this.notificationService.warning(
              'Attention',
              'Chargement des types par défaut'
            );
          }
        },
        error: (error) => {
          console.error('Erreur API lors du chargement des types:', error);
          this.loadDefaultExpenseTypes();
          this.notificationService.error(
            'Erreur',
            'Impossible de charger les types de dépenses'
          );
        },
      });
    }
  }

  private loadDefaultExpenseTypes(): void {
    this.expenseTypes = [
      'Eau/Électricité',
      'Produits',
      'Nourriture',
      'Maintenance',
      'Personnel',
      'Transport',
      'Marketing',
      'Assurance',
      'Taxes',
      'Autres',
    ];
  }
  //#endregion

  //#region Expenses Methods
  loadExpenses(): void {
    if (this.selectedCentreId) {
      this.loading = true;

      const loadObservable = this.selectedType
        ? this.expensesService.getExpensesByType(
            this.selectedCentreId,
            this.selectedType,
            1,
            50
          )
        : this.expensesService.getExpensesByCentre(
            this.selectedCentreId,
            1,
            50
          );

      loadObservable.subscribe({
        next: (response) => {
          this.handleExpensesResponse(response);
        },
        error: (error) => {
          this.handleExpensesError(error);
        },
      });
    }
  }

  private handleExpensesResponse(
    response: ApiResponseData<PaginatedResponse<Expense>>
  ): void {
    if (response.success) {
      this.expenses = response.data.items;
      this.calculateStats();
    } else {
      console.error('Erreur:', response.message);
      this.expenses = [];
      this.notificationService.warning(
        'Attention',
        'Aucune donnée de dépenses disponible'
      );
    }
    this.loading = false;
  }

  private handleExpensesError(error: any): void {
    console.error('Erreur API:', error);
    this.expenses = [];
    this.loading = false;
    this.notificationService.error(
      'Erreur',
      'Impossible de charger les dépenses'
    );
  }

  private calculateStats(): void {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filtre pour le mois en cours
    const expensesThisMonth = this.expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear
      );
    });

    // Filtre pour l'année en cours
    const expensesThisYear = this.expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getFullYear() === currentYear;
    });

    // Calcul des totaux
    this.expenseStats.totalMensuel = expensesThisMonth.reduce(
      (total, expense) => total + expense.amount,
      0
    );
    this.expenseStats.totalAnnuel = expensesThisYear.reduce(
      (total, expense) => total + expense.amount,
      0
    );
    this.expenseStats.moyenneMensuelle = this.expenseStats.totalAnnuel / 12;

    // Dépenses par type
    this.expenseStats.depensesParType = {};
    this.expenses.forEach((expense) => {
      this.expenseStats.depensesParType[expense.type] =
        (this.expenseStats.depensesParType[expense.type] || 0) + expense.amount;
    });

    // Dépenses mensuelles (simplifié)
    this.expenseStats.depensesMensuelles = {};
    expensesThisYear.forEach((expense) => {
      const month = new Date(expense.date).getMonth();
      this.expenseStats.depensesMensuelles[month] =
        (this.expenseStats.depensesMensuelles[month] || 0) + expense.amount;
    });
  }

  getTotalAmount(): number {
    return this.expenses.reduce((total, expense) => total + expense.amount, 0);
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
    }).format(amount);
  }

  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('fr-FR').format(dateObj);
  }

  getExpenseTypeAmount(type: string): number {
    return this.expenseStats.depensesParType[type] || 0;
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
      this.notificationService.warning(
        'Formulaire incomplet',
        'Veuillez remplir tous les champs obligatoires'
      );
      return;
    }

    this.submitting = true;

    if (this.isEditMode && this.editingExpenseId) {
      this.expensesService
        .updateExpense(this.editingExpenseId, this.expenseForm)
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.success(
                'Succès',
                'Dépense modifiée avec succès!'
              );
              this.resetForm();
              this.loadExpenses();
              this.switchView('grid');
            } else {
              this.notificationService.error('Erreur', response.message);
            }
            this.submitting = false;
          },
          error: (error) => {
            console.error('Erreur API:', error);
            this.notificationService.error(
              'Erreur',
              'Une erreur est survenue lors de la modification'
            );
            this.submitting = false;
          },
        });
    } else {
      this.expensesService.createExpense(this.expenseForm).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success(
              'Succès',
              'Dépense enregistrée avec succès!'
            );
            this.resetForm();
            this.loadExpenses();
            this.switchView('cards');
          } else {
            this.notificationService.error('Erreur', response.message);
          }
          this.submitting = false;
        },
        error: (error) => {
          console.error('Erreur API:', error);
          this.notificationService.error(
            'Erreur',
            "Une erreur est survenue lors de l'enregistrement"
          );
          this.submitting = false;
        },
      });
    }
  }

  isFormValid(): boolean {
    return (
      !!this.expenseForm.type &&
      !!this.expenseForm.centreId &&
      !!this.expenseForm.description &&
      this.expenseForm.amount > 0 &&
      !!this.expenseForm.date
    );
  }

  resetForm(): void {
    this.expenseForm = {
      type: '',
      description: '',
      amount: 0,
      date: new Date(),
      centreId: this.selectedCentreId,
    };

    // Réinitialiser le mode édition
    this.isEditMode = false;
    this.editingExpenseId = null;
  }
  //#endregion

  //#region View Navigation
  switchView(view: 'cards' | 'grid' | 'form'): void {
    this.activeView = view;

    // Si on quitte la vue formulaire, réinitialiser le mode édition
    if (view !== 'form') {
      this.resetForm();
    }

    // Si on va vers le formulaire et qu'on n'est pas en mode édition
    // S'assurer que le formulaire est vide
    if (view === 'form' && !this.isEditMode) {
      this.resetForm();
    }
  }

  isActiveView(view: string): boolean {
    return this.activeView === view;
  }
  //#endregion

  //#region User Methods (inchangés)
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
        this.notificationService.error(
          'Erreur',
          'Impossible de charger les utilisateurs'
        );
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

  // Méthode pour obtenir l'icône selon le type de dépense
  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      Electricité: 'fa-bolt',
      Eau: 'fa-tint',
      Internet: 'fa-wifi',
      Téléphone: 'fa-phone',
      Fournitures: 'fa-box',
      Maintenance: 'fa-tools',
      Salaires: 'fa-users',
      Loyer: 'fa-building',
      Assurance: 'fa-shield-alt',
      Transport: 'fa-car',
      Marketing: 'fa-bullhorn',
      Formation: 'fa-graduation-cap',
      Équipement: 'fa-laptop',
      Autres: 'fa-ellipsis-h',
    };

    return icons[type] || 'fa-file-invoice-dollar';
  }

  // Méthode pour obtenir la classe CSS du badge selon le type
  getTypeBadgeClass(type: string): string {
    const classes: { [key: string]: string } = {
      Electricité: 'warning',
      Eau: 'primary',
      Internet: 'info',
      Téléphone: 'success',
      Fournitures: 'primary',
      Maintenance: 'warning',
      Salaires: 'success',
      Loyer: 'danger',
      Assurance: 'info',
      Transport: 'warning',
      Marketing: 'primary',
      Formation: 'success',
      Équipement: 'info',
      Autres: 'secondary',
    };

    return classes[type] || 'primary';
  }

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

  closeDeleteConfirmation(): void {
    this.showDeleteConfirmation = false;
    this.expenseToDelete = null;
  }

  confirmDelete(): void {
    if (this.expenseToDelete) {
      this.deleteExpense(this.expenseToDelete.id?.toString() || '');
      this.closeDeleteConfirmation();
    }
  }

  //#region Auth Methods
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

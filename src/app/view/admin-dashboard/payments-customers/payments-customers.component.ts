import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { Users } from '../../../core/models/Users/Users';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';

import { CustomerPaymentFilter } from '../../../core/models/Payments/CustomerPaymentFilter';
import { CustomerPaymentStatistics } from '../../../core/models/Payments/CustomerPaymentStatistics';
import { ApiResponseData } from '../../../core/models/ApiResponseData';
import { CustomerPayment } from '../../../core/models/Payments/CustomerPayment';
import { PaymentMethod } from '../../../core/models/Payments/PaymentMethod';
import { PaymentStatus } from '../../../core/models/Payments/PaymentStatus';
import { PaymentsService } from '../../../core/services/Payments/payments.service';
import { Centres } from '../../../core/models/Centres/Centres';
import { CentresService } from '../../../core/services/Centres/centres.service';

@Component({
  selector: 'app-payments-customers',
  imports: [RouterLink, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './payments-customers.component.html',
  styleUrl: './payments-customers.component.scss'
})
export class PaymentsCustomersComponent implements OnInit {
[x: string]: any;
  //#region PROPRIÉTÉS DE CLASSE
  // ====================================================================

  // Liste des utilisateurs
  users: Users[] = [];
  filteredUsers: Users[] = [];
  displayedUsers: Users[] = [];
  currentUser: Users | null = null;

  // États et chargement
  isLoading: boolean = true;
  paymentsLoading: boolean = false;
  statisticsLoading: boolean = false;
  exportLoading: boolean = false;

  // Données des paiements
  customerPayments: CustomerPayment[] = [];
  paymentStatistics: CustomerPaymentStatistics | null = null;
  showFilters: boolean = true;

  // Filtres
  paymentFilter: CustomerPaymentFilter = new CustomerPaymentFilter();
   centres: Centres[] = [];

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;

  // Recherche
  searchTerm: string = '';
  Math = Math;

  // Sélections
  selectedStatus: PaymentStatus | 'all' = 'all';
  selectedMethod: PaymentMethod | 'all' = 'all';

  // Statistiques affichées
  showStatistics: boolean = true;

  //#endregion

  //#region CONSTRUCTEUR
  // ====================================================================

  constructor(
    private router: Router,
    private usersService: UsersService,
    private authService: AuthService,
    private paymentsService: PaymentsService,
    private centresService: CentresService,
    private sanitizer: DomSanitizer
  ) {}

  //#endregion

   /**
   * Retourne le nombre de paiements par statut
   */
  getPaymentCountByStatus(status: PaymentStatus): number {
    return this.customerPayments.filter(payment => payment.status === status).length;
  }


  //#region LIFECYCLE HOOKS
  // ====================================================================

  /**
   * Initialisation du composant
   */
  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadCentres();
    this.loadCustomerPayments();
    this.loadPaymentStatistics();

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

  //#endregion


    //#region CHARGEMENT DES CENTRES
  // ====================================================================

  /**
   * Charge la liste des centres
   */
  loadCentres(): void {
    this['centresLoading'] = true;

    this.centresService.getAllCentres().subscribe({
      next: (centres) => {
        this.centres = centres;
        this['centresLoading'] = false;
        console.log(`✅ ${centres.length} centres chargés`);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des centres:', error);
        this['centresLoading'] = false;
      }
    });
  }

  /**
   * Retourne le nom d'un centre à partir de son ID
   */
  getCentreName(centreId: string): string {
    const centre = this.centres.find(c => c.id === centreId);
    return centre ? centre.name : `Centre (${centreId})`;
  }

  //#endregion

  //#region GESTION DES PAIEMENTS CLIENTS
  // ====================================================================

  /**
   * Basculer l'affichage des filtres
   */
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  /**
   * Charge la liste des paiements clients
   */
  loadCustomerPayments(): void {
    this.paymentsLoading = true;

    this.paymentsService.getCustomerPayments(this.paymentFilter).subscribe({
      next: (response: ApiResponseData<CustomerPayment[]>) => {
        if (response.success) {
          this.customerPayments = response.data;
          this.totalItems = response.data.length;
          this.calculatePagination();
          console.log(`${response.data.length} paiements clients chargés`);
        } else {
          console.error(' Erreur lors du chargement des paiements:', response.message);
        }
        this.paymentsLoading = false;
        this.isLoading = false;
      },
      error: (error) => {
        console.error(' Erreur lors du chargement des paiements:', error);
        this.paymentsLoading = false;
        this.isLoading = false;
      }
    });
  }

  /**
   * Charge les statistiques des paiements
   */
  loadPaymentStatistics(): void {
    this.statisticsLoading = true;

    this.paymentsService.getCustomerPaymentStatistics(this.paymentFilter).subscribe({
      next: (response: ApiResponseData<CustomerPaymentStatistics>) => {
        if (response.success) {
          this.paymentStatistics = response.data;
          console.log(' Statistiques des paiements chargées');
        } else {
          console.error(' Erreur lors du chargement des statistiques:', response.message);
        }
        this.statisticsLoading = false;
      },
      error: (error) => {
        console.error(' Erreur lors du chargement des statistiques:', error);
        this.statisticsLoading = false;
      }
    });
  }

  /**
   * Exporte les paiements en Excel
   */
  exportToExcel(): void {
    this.exportLoading = true;

    this.paymentsService.exportCustomerPaymentsToExcel(this.paymentFilter).subscribe({
      next: () => {
        this.exportLoading = false;
        console.log(' Export Excel terminé avec succès');
      },
      error: (error) => {
        this.exportLoading = false;
        console.error(' Erreur lors de l\'export Excel:', error);
        // Afficher un message d'erreur à l'utilisateur
        alert('Erreur lors de l\'export Excel: ' + error.message);
      }
    });
  }

  /**
   * Applique les filtres de recherche
   */
  applyFilters(): void {
    this.paymentFilter.page = 1;
    this.loadCustomerPayments();
    this.loadPaymentStatistics();
  }

  /**
   * Réinitialise les filtres
   */
  resetFilters(): void {
    this.paymentFilter = new CustomerPaymentFilter();
    this.selectedStatus = 'all';
    this.selectedMethod = 'all';
    this.searchTerm = '';
    this.loadCustomerPayments();
    this.loadPaymentStatistics();
  }

  /**
   * Filtre les paiements par statut
   */
  filterByStatus(status: PaymentStatus | 'all'): void {
    this.selectedStatus = status;
    this.paymentFilter.status = status === 'all' ? undefined : status;
    this.applyFilters();
  }

  /**
   * Filtre les paiements par méthode
   */
  filterByMethod(method: PaymentMethod | 'all'): void {
    this.selectedMethod = method;
    this.paymentFilter.method = method === 'all' ? undefined : method;
    this.applyFilters();
  }

  /**
   * Recherche dans les paiements
   */
  searchPayments(): void {
    this.paymentFilter.customerPhone = this.searchTerm || undefined;
    this.paymentFilter.vehiclePlate = this.searchTerm || undefined;
    this.applyFilters();
  }

  //#endregion

  //#region PAGINATION
  // ====================================================================

  /**
   * Calcule la pagination
   */
  calculatePagination(): void {
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = Math.min(this.currentPage, this.totalPages);
  }

  /**
   * Change de page
   */
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.paymentFilter.page = page;
      this.loadCustomerPayments();
    }
  }

  /**
   * Récupère les paiements de la page courante
   */
  get paginatedPayments(): CustomerPayment[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.customerPayments.slice(startIndex, endIndex);
  }

  /**
   * Génère la liste des pages pour la pagination
   */
  get pages(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  //#endregion

  //#region MÉTHODES UTILITAIRES PAIEMENTS
  // ====================================================================

  /**
   * Formate un montant
   */
  formatAmount(amount: number): string {
    return this.paymentsService.formatAmount(amount);
  }

  /**
   * Retourne le nom d'affichage d'une méthode de paiement
   */
  getPaymentMethodName(method: PaymentMethod): string {
    return this.paymentsService.getPaymentMethodDisplayName(method);
  }

  /**
   * Retourne le nom d'affichage d'un statut
   */
  getPaymentStatusName(status: PaymentStatus): string {
    return this.paymentsService.getPaymentStatusDisplayName(status);
  }

  /**
   * Retourne la classe CSS pour un statut
   */
  getPaymentStatusClass(status: PaymentStatus): string {
    return this.paymentsService.getPaymentStatusClass(status);
  }

  /**
   * Calcule le total des paiements affichés
   */
  get displayedTotalAmount(): number {
    return this.paymentsService.calculateTotalAmount(this.paginatedPayments);
  }

  //#endregion

  //#region GESTION DE L'UTILISATEUR COURANT
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

  //#endregion

  //#region GESTION DES PHOTOS
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

  //#endregion

  //#region DÉCONNEXION
  // ====================================================================

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

  //#endregion
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { Subject, catchError, finalize, of, takeUntil, forkJoin } from 'rxjs';

// Services
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { PaymentsService } from '../../../core/services/Payments/payments.service';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { NotificationService } from '../../../core/services/Notification/notification.service';

// Models
import { Users } from '../../../core/models/Users/Users';
import { Payment } from '../../../core/models/Payments/Payment';
import { PaymentMethod } from '../../../core/models/Payments/PaymentMethod';
import { PaymentType } from '../../../core/models/Payments/PaymentType';
import { Centres } from '../../../core/models/Centres/Centres';
import { ApiResponseData } from '../../../core/models/ApiResponseData';

@Component({
  selector: 'app-payments-history',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './payments-history.component.html',
  styleUrl: './payments-history.component.scss'
})
export class PaymentsHistoryComponent implements OnInit, OnDestroy {
  //#region Properties

  // Utilisateur courant (le laveur)
  currentUser: Users | null = null;
  currentCentre: Centres | null = null;
  isSidebarCollapsed = false;

  // Paiements du laveur
  washerPayments: Payment[] = [];
  filteredPayments: Payment[] = [];
  isLoading = false;

  // Cache des utilisateurs pour les noms
  usersCache: Map<string, Users> = new Map();
  approversCache: Map<string, string> = new Map(); // Cache pour les noms des validateurs

  // Statistiques du laveur
  washerStats = {
    totalPaid: 0,
    totalPending: 0,
    averageCommission: 0,
    lastPaymentDate: '',
    nextPaymentEstimate: 0,
    commissionRate: 30 // 30% de commission
  };

  // Filtres
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number | string = 'all'; // 'all' ou 1-12
  selectedStatus: string = 'all'; // all, paid, pending
  searchTerm: string = '';

  // Années disponibles (année courante et 2 précédentes)
  availableYears: number[] = [];

  // Mois disponibles
  months = [
    { id: 'all', name: 'Tous les mois' },
    { id: 1, name: 'Janvier' },
    { id: 2, name: 'Février' },
    { id: 3, name: 'Mars' },
    { id: 4, name: 'Avril' },
    { id: 5, name: 'Mai' },
    { id: 6, name: 'Juin' },
    { id: 7, name: 'Juillet' },
    { id: 8, name: 'Août' },
    { id: 9, name: 'Septembre' },
    { id: 10, name: 'Octobre' },
    { id: 11, name: 'Novembre' },
    { id: 12, name: 'Décembre' }
  ];

  // Souscription pour cleanup
  private destroy$ = new Subject<void>();

  //#endregion

  //#region Constructor
  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService,
    private router: Router,
    private authService: AuthService,
    private paymentsService: PaymentsService,
    private centresService: CentresService,
    private notificationService: NotificationService
  ) {}
  //#endregion

  //#region Lifecycle Hooks
  ngOnInit(): void {
    this.loadCurrentUser();
    this.setupUserSubscriptions();
    this.initializeAvailableYears();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  //#endregion

  //#region User Management Methods
  /**
   * Charge l'utilisateur actuellement connecté (le laveur)
   */
  loadCurrentUser(): void {
    this.authService.loadCurrentUserProfile().subscribe({
      next: (user) => {
        if (user) {
          this.handleUserLoaded(user);
        } else {
          this.loadUserFallback();
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement du profil', error);
        this.loadUserFallback();
      }
    });
  }

  /**
   * Setup des souscriptions utilisateur
   */
  private setupUserSubscriptions(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user && user.id !== this.currentUser?.id) {
        this.currentUser = user;
        this.loadWasherCentre();
      }
    });
  }

  /**
   * Méthode de secours si le chargement du profil échoue
   */
  private loadUserFallback(): void {
    this.usersService.getCurrentUser().subscribe({
      next: (user) => {
        this.handleUserLoaded(user);
      },
      error: (error) => {
        console.error('Erreur lors du chargement utilisateur fallback', error);
        this.router.navigate(['/auth/login']);
      }
    });
  }

  /**
   * Gère l'utilisateur chargé avec succès
   */
  private handleUserLoaded(user: Users): void {
    this.currentUser = user;
    this.loadCurrentUserPhoto();
    this.loadWasherCentre();
  }

  /**
   * Charge le centre assigné au laveur
   */
  loadWasherCentre(): void {
    if (!this.currentUser?.id) {
      console.warn('Aucun utilisateur connecté');
      return;
    }

    // Si l'utilisateur a un centreId directement
    if (this.currentUser.centreId) {
      this.loadCentreById(this.currentUser.centreId);
      return;
    }

    // Sinon, chercher parmi tous les centres
    this.findCentreForWasher();
  }

  /**
   * Charge un centre par son ID
   */
  private loadCentreById(centreId: string): void {
    this.centresService.getCentreById(centreId).subscribe({
      next: (centre) => {
        if (centre && centre.id) {
          this.currentCentre = centre;
          console.log(`✅ Centre trouvé: ${centre.name}`);
          this.loadWasherPayments();
        } else {
          console.warn('Centre retourné invalide');
          this.findCentreForWasher();
        }
      },
      error: (error) => {
        console.error('Erreur chargement centre par ID:', error);
        this.findCentreForWasher();
      }
    });
  }

  /**
   * Cherche un centre pour le laveur parmi tous les centres
   */
  private findCentreForWasher(): void {
    this.centresService.getAllCentres().subscribe({
      next: (centres) => {
        if (centres.length > 0) {
          // Pour un laveur, on prend le premier centre disponible
          this.currentCentre = centres[0];

          // Mettre à jour l'utilisateur avec le centre
          if (this.currentUser && this.currentCentre.id) {
            this.currentUser.centreId = this.currentCentre.id;
          }

          console.log(`🏢 Centre attribué: ${this.currentCentre.name}`);
          this.loadWasherPayments();
        } else {
          console.warn('Aucun centre disponible');
          this.showNoCentreMessage();
        }
      },
      error: (error) => {
        console.error('Erreur recherche centres:', error);
        this.showNoCentreMessage();
      }
    });
  }

  /**
   * Affiche un message si aucun centre n'est trouvé
   */
  private showNoCentreMessage(): void {
    this.notificationService.warning(
      'Centre non assigné',
      'Aucun centre ne vous est actuellement assigné. Contactez votre manager.'
    );
  }

  /**
   * Charge la photo de l'utilisateur courant
   */
  loadCurrentUserPhoto(): void {
    if (!this.currentUser || !this.currentUser.photoUrl) {
      this.setDefaultUserPhoto();
      return;
    }

    if (typeof this.currentUser.photoUrl === 'string') {
      this.usersService.getUserPhoto(this.currentUser.photoUrl).subscribe({
        next: (blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (this.currentUser) {
              this.currentUser.photoSafeUrl = this.sanitizer.bypassSecurityTrustUrl(
                reader.result as string
              );
            }
          };
          reader.readAsDataURL(blob);
        },
        error: () => {
          this.setDefaultUserPhoto();
        }
      });
    } else {
      this.setDefaultUserPhoto();
    }
  }

  /**
   * Définit une photo par défaut
   */
  private setDefaultUserPhoto(): void {
    if (this.currentUser) {
      this.currentUser.photoSafeUrl = this.sanitizer.bypassSecurityTrustUrl(
        'assets/images/default-avatar.png'
      );
    }
  }

  /**
   * Retourne le nom complet du laveur
   */
  getFullName(): string {
    if (this.currentUser) {
      const firstName = this.currentUser.firstName || '';
      const lastName = this.currentUser.lastName || '';
      return `${firstName} ${lastName}`.trim() || 'Laveur';
    }
    return 'Laveur';
  }

  /**
   * Retourne le rôle formaté
   */
  getUserRole(): string {
    if (!this.currentUser) return 'Laveur';

    if (this.currentUser.roles && this.currentUser.roles.length > 0) {
      return this.mapRoleIdToName(this.currentUser.roles[0]);
    }

    const role = this.authService.getUserRole();
    return role ? this.mapRoleIdToName(role) : 'Laveur';
  }

  /**
   * Mappe l'ID de rôle vers un nom lisible
   */
  private mapRoleIdToName(roleId: string): string {
    const roleMapping: { [key: string]: string } = {
      '1': 'Administrateur',
      '2': 'Manager',
      '3': 'Laveur',
      '4': 'Employé'
    };
    return roleMapping[roleId] || 'Laveur';
  }
  //#endregion

  //#region Payments Management Methods
  /**
   * Charge les paiements du laveur
   */
  loadWasherPayments(): void {
    if (!this.currentUser?.id || !this.currentCentre?.id) {
      console.warn('Utilisateur ou centre non défini');
      return;
    }

    this.isLoading = true;

    // Construire le filtre CORRIGÉ
    const filter: any = {
      userId: this.currentUser.id, // Peut-être userId au lieu de washerId
      centreId: this.currentCentre.id,
      userType: 'washer'
    };

    // CORRECTION 1: Ajouter le filtre d'année seulement si différent de 'all'
    if (this.selectedYear) {
      filter.year = this.selectedYear;
    }

    // CORRECTION 2: Ajouter le filtre de mois seulement si différent de 'all'
    if (this.selectedMonth !== 'all') {
      filter.month = this.selectedMonth;
    }

    console.log('Filtre envoyé:', filter);

    this.paymentsService.getPaymentsWithFilter(filter)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Erreur chargement paiements:', error);
          this.notificationService.error('Erreur', 'Impossible de charger vos paiements');
          return of({ success: false, data: [] } as unknown as ApiResponseData<Payment[]>);
        }),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.handlePaymentsLoaded(response.data);
          } else {
            this.washerPayments = [];
            this.filteredPayments = [];
            this.calculateStats();
          }
        }
      });
  }

  /**
   * Gère les paiements chargés
   */
  private handlePaymentsLoaded(payments: Payment[]): void {
    // Trier par date (plus récent en premier)
    this.washerPayments = payments.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Charger les informations des validateurs
    this.loadApproversInfo(payments);

    // Appliquer les filtres
    this.applyFilters();

    // Calculer les statistiques
    this.calculateStats();
  }

  /**
   * Charge les informations des utilisateurs qui ont validé les paiements
   */
  private loadApproversInfo(payments: Payment[]): void {
    // Extraire tous les IDs uniques des validateurs
    const approverIds = new Set<string>();
    payments.forEach(payment => {
      if (payment.approvedBy) {
        approverIds.add(payment.approvedBy);
      }
    });

    // Charger les informations des validateurs
    approverIds.forEach(approverId => {
      if (!this.approversCache.has(approverId)) {
        this.usersService.getUserById(approverId).subscribe({
          next: (user) => {
            if (user) {
              const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
              this.approversCache.set(approverId, fullName || 'Inconnu');
            }
          },
          error: () => {
            this.approversCache.set(approverId, approverId); // Fallback à l'ID
          }
        });
      }
    });
  }

  /**
   * Calcule les statistiques des paiements
   */
  private calculateStats(): void {
    const paidPayments = this.washerPayments.filter(p => p.approvedBy);
    const pendingPayments = this.washerPayments.filter(p => !p.approvedBy);

    this.washerStats.totalPaid = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    this.washerStats.totalPending = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Calculer la commission moyenne
    if (paidPayments.length > 0) {
      this.washerStats.averageCommission = this.washerStats.totalPaid / paidPayments.length;
    } else {
      this.washerStats.averageCommission = 0;
    }

    // Dernier paiement
    if (paidPayments.length > 0) {
      const lastPayment = paidPayments[0];
      this.washerStats.lastPaymentDate = this.formatDate(lastPayment.paymentDate);
    } else {
      this.washerStats.lastPaymentDate = 'Aucun paiement';
    }

    // Estimation du prochain paiement (simplifié)
    this.calculateNextPaymentEstimate();
  }

  /**
   * Calcule une estimation du prochain paiement
   */
  private calculateNextPaymentEstimate(): void {
    // Logique simplifiée : moyenne des 3 derniers mois
    const paidPayments = this.washerPayments.filter(p => p.approvedBy);

    if (paidPayments.length >= 3) {
      const lastThreePayments = paidPayments.slice(0, 3);
      const total = lastThreePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      this.washerStats.nextPaymentEstimate = total / 3;
    } else if (paidPayments.length > 0) {
      // Moyenne de tous les paiements
      this.washerStats.nextPaymentEstimate = this.washerStats.averageCommission;
    } else {
      this.washerStats.nextPaymentEstimate = 0;
    }
  }

  /**
   * Applique tous les filtres - CORRIGÉ
   */
  applyFilters(): void {
    let filtered = [...this.washerPayments];

    // Filtre par statut
    if (this.selectedStatus !== 'all') {
      if (this.selectedStatus === 'paid') {
        filtered = filtered.filter(p => p.approvedBy);
      } else if (this.selectedStatus === 'pending') {
        filtered = filtered.filter(p => !p.approvedBy);
      }
    }

    // CORRECTION 3: Filtre par année et mois (filtrage local)
    if (this.selectedYear) {
      filtered = filtered.filter(payment => {
        if (!payment.paymentDate) return false;
        const paymentDate = new Date(payment.paymentDate);
        return paymentDate.getFullYear() === this.selectedYear;
      });
    }

    if (this.selectedMonth !== 'all') {
      filtered = filtered.filter(payment => {
        if (!payment.paymentDate) return false;
        const paymentDate = new Date(payment.paymentDate);
        // +1 car les mois sont 0-indexed en JavaScript
        return (paymentDate.getMonth() + 1) === this.selectedMonth;
      });
    }

    // CORRECTION 4: Filtre par recherche amélioré
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(payment => {
        // Rechercher dans plusieurs champs
        const searchFields = [
          payment.id,
          payment.notes,
          payment.paymentType !== undefined ? this.getPaymentTypeLabel(payment.paymentType) : '',
          payment.method !== undefined ? this.getPaymentMethodLabel(payment.method) : '',
          payment.amount ? this.formatAmount(payment.amount) : '',
          payment.approvedBy ? this.getApproverName(payment) : ''
        ];

        return searchFields.some(field =>
          field && field.toString().toLowerCase().includes(term)
        );
      });
    }

    this.filteredPayments = filtered;
    console.log('Payments filtrés:', this.filteredPayments.length);
  }

  /**
   * Change le filtre d'année - CORRIGÉ
   */
  onYearChange(): void {
    console.log('Changement année:', this.selectedYear);
    this.applyFilters(); // Filtrage local seulement
    this.calculateStats(); // Recalculer les stats avec le nouveau filtre
  }

  /**
   * Change le filtre de mois - CORRIGÉ
   */
  onMonthChange(): void {
    console.log('Changement mois:', this.selectedMonth);
    this.applyFilters(); // Filtrage local seulement
  }

  /**
   * Change le filtre de statut - CORRIGÉ
   */
  onStatusChange(): void {
    console.log('Changement statut:', this.selectedStatus);
    this.applyFilters();
  }

  /**
   * Lance la recherche - CORRIGÉ
   */
  onSearch(): void {
    console.log('Recherche avec terme:', this.searchTerm);
    this.applyFilters();
  }

  /**
   * Réinitialise tous les filtres - CORRIGÉ
   */
  resetFilters(): void {
    this.selectedYear = new Date().getFullYear();
    this.selectedMonth = 'all';
    this.selectedStatus = 'all';
    this.searchTerm = '';
    this.applyFilters(); // Appliquer le filtrage local
    this.calculateStats(); // Recalculer les stats
  }

  /**
   * Rafraîchit les données
   */
  refreshData(): void {
    this.loadWasherPayments();
  }
  //#endregion

  //#region UI Helper Methods
  /**
   * Initialise les années disponibles
   */
  private initializeAvailableYears(): void {
    const currentYear = new Date().getFullYear();
    this.availableYears = [currentYear, currentYear - 1, currentYear - 2];
    this.selectedYear = currentYear;
  }

  /**
   * Retourne le nom du mois
   */
  getMonthName(monthNumber: number): string {
    const month = this.months.find(m => m.id === monthNumber);
    return month ? month.name : '';
  }

  /**
   * Retourne le libellé du type de paiement - CORRIGÉ POUR LES NOMBRES
   */
  getPaymentTypeLabel(type: PaymentType | string | number): string {
    // Si c'est un nombre, essayer de le convertir en enum
    if (typeof type === 'number') {
      // Trouver la clé correspondante dans l'enum
      const enumKey = Object.keys(PaymentType).find(
        key => PaymentType[key as keyof typeof PaymentType] === type
      );
      if (enumKey) {
        type = PaymentType[enumKey as keyof typeof PaymentType];
      }
    }

    // Si c'est une string, essayer de la convertir
    if (typeof type === 'string') {
      const enumKey = type as keyof typeof PaymentType;
      if (PaymentType[enumKey] !== undefined) {
        type = PaymentType[enumKey];
      }
    }

    // Maintenant type devrait être de type PaymentType
    const labels: { [key in PaymentType]?: string } = {
      [PaymentType.PerService]: 'Par service',
      [PaymentType.Daily]: 'Quotidien',
      [PaymentType.Weekly]: 'Hebdomadaire',
      [PaymentType.Monthly]: 'Mensuel',
      [PaymentType.Bonus]: 'Bonus',
      [PaymentType.Other]: 'Autre',
      [PaymentType.Quarterly]: 'Trimestriel'
    };

    return labels[type as PaymentType] || type?.toString() || 'Inconnu';
  }

  /**
   * Retourne le libellé de la méthode de paiement - CORRIGÉ POUR LES NOMBRES
   */
  getPaymentMethodLabel(method: string | PaymentMethod | number): string {
    let paymentMethod: PaymentMethod;

    // Gestion des nombres
    if (typeof method === 'number') {
      // Trouver la clé correspondante dans l'enum
      const enumKey = Object.keys(PaymentMethod).find(
        key => PaymentMethod[key as keyof typeof PaymentMethod] === method
      );
      if (enumKey) {
        paymentMethod = PaymentMethod[enumKey as keyof typeof PaymentMethod];
      } else {
        paymentMethod = PaymentMethod.CASH;
      }
    }
    // Gestion des strings
    else if (typeof method === 'string') {
      paymentMethod = PaymentMethod[method as keyof typeof PaymentMethod] || PaymentMethod.CASH;
    }
    // Déjà un enum
    else {
      paymentMethod = method;
    }

    const labels: { [key in PaymentMethod]: string } = {
      [PaymentMethod.CASH]: 'Espèces',
      [PaymentMethod.MOBILE_MONEY]: 'Mobile Money',
      [PaymentMethod.BANK_TRANSFER]: 'Virement Bancaire',
      [PaymentMethod.CREDIT_CARD]: 'Carte de Crédit',
      [PaymentMethod.CHECK]: 'Chèque'
    };

    return labels[paymentMethod] || 'Inconnu';
  }

  /**
   * Retourne le badge CSS pour un statut
   */
  getStatusBadgeClass(payment: Payment): string {
    if (payment.approvedBy) {
      return 'badge bg-success-light text-success';
    } else if (payment.amount === 0) {
      return 'badge bg-danger-light text-danger';
    } else {
      return 'badge bg-warning-light text-warning';
    }
  }

  /**
   * Retourne le texte du statut
   */
  getStatusText(payment: Payment): string {
    if (payment.approvedBy) {
      return 'Payé';
    } else if (payment.amount === 0) {
      return 'Échoué';
    } else {
      return 'En attente';
    }
  }

  /**
   * Formate un montant en FCFA
   */
  formatAmount(amount: number | undefined | null): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '0 FCFA';
    }

    const formatter = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    return `${formatter.format(amount)} FCFA`;
  }

  /**
   * Formate une date
   */
  formatDate(dateString: string | Date): string {
    if (!dateString) return 'Non spécifié';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';

      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Date invalide';
    }
  }

  /**
   * Formate une date avec l'heure
   */
  formatDateTime(dateString: string | Date): string {
    if (!dateString) return 'Non spécifié';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';

      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date invalide';
    }
  }

  /**
   * Calcule le mois/année d'un paiement
   */
  getPaymentPeriod(payment: Payment): string {
    if (payment.paymentDate) {
      try {
        const date = new Date(payment.paymentDate);
        if (isNaN(date.getTime())) return 'Date invalide';

        const month = this.getMonthName(date.getMonth() + 1);
        const year = date.getFullYear();
        return `${month} ${year}`;
      } catch {
        return 'Date invalide';
      }
    }
    return 'Non spécifié';
  }

  /**
   * Vérifie si le paiement est pour le mois en cours
   */
  isCurrentMonthPayment(payment: Payment): boolean {
    if (!payment.paymentDate) return false;

    try {
      const paymentDate = new Date(payment.paymentDate);
      if (isNaN(paymentDate.getTime())) return false;

      const now = new Date();
      return (
        paymentDate.getMonth() === now.getMonth() &&
        paymentDate.getFullYear() === now.getFullYear()
      );
    } catch {
      return false;
    }
  }

  /**
   * CORRECTION 5: Obtient le nom de la personne qui a approuvé
   */
  getApproverName(payment: Payment): string {
    if (!payment.approvedBy) return 'Non validé';

    // Vérifier le cache
    if (this.approversCache.has(payment.approvedBy)) {
      return this.approversCache.get(payment.approvedBy) || payment.approvedBy;
    }

    // Si pas dans le cache, retourner l'ID temporairement
    return payment.approvedBy;
  }
  //#endregion

  //#region UI Interaction Methods
  /**
   * Bascule la sidebar
   */
  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;

    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    if (sidebar && mainContent) {
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('collapsed');
    }
  }

  /**
   * Retourne le nom du centre actuel
   */
  getCurrentCentreName(): string {
    return this.currentCentre?.name || 'Centre non défini';
  }

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

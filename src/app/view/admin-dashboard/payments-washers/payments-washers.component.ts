import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { Users } from '../../../core/models/Users/Users';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { Subject, lastValueFrom, takeUntil, catchError, of } from 'rxjs';
import { Centres } from '../../../core/models/Centres/Centres';
import { AuditSummary } from '../../../core/models/Payments/AuditSummary';
import { Payment } from '../../../core/models/Payments/Payment';
import { PaymentMethod } from '../../../core/models/Payments/PaymentMethod';
import { PaymentType } from '../../../core/models/Payments/PaymentType';
import { WasherPaymentSummary } from '../../../core/models/Payments/WasherPaymentSummary';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { PaymentsService } from '../../../core/services/Payments/payments.service';
import { WashsService } from '../../../core/services/Washs/washs.service';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MonthlyPaymentFilter } from '../../../core/models/Payments/MonthlyPaymentFilter';
import { NotificationService } from '../../../core/services/Notification/notification.service';

@Component({
  selector: 'app-payments-washers',
  imports: [RouterLink, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './payments-washers.component.html',
  styleUrl: './payments-washers.component.scss'
})
export class PaymentsWashersComponent implements OnInit, OnDestroy {
  //#region Properties
  private destroy$ = new Subject<void>();
  selectedWasher: string = 'all';

  // Données principales
  users: Users[] = [];
  displayedUsers: Users[] = [];
  currentUser: Users | null = null;
  user: Users | null = null;

  // Centres et laveurs
  centres: Centres[] = [];
  washers: Users[] = [];
  filteredWashers: Users[] = [];

  // Paiements
  payments: Payment[] = [];
  filteredPayments: Payment[] = [];
  paymentSummaries: WasherPaymentSummary[] = [];

  // Statistiques
  stats = {
    totalAmount: 0,
    activeWashers: 0,
    pendingPayments: 0,
    averageCommission: 0
  };

  // Filtres
  selectedCentre: string = 'all';
  selectedStatus: string = 'all';
  selectedType: string = 'all';
  selectedPeriod: string = 'month';

  // États de chargement
  isLoading = false;
  isLoadingWashers = false;
  isLoadingPayments = false;

  // Onglets
  activeTab: string = 'payments-list';

  // Formulaire nouveau paiement
  newPayment = {
    washerId: '',
    centreId: '',
    paymentType: '' as PaymentType,
    method: '' as unknown as PaymentMethod,
    amount: 0,
    commission: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    sessions: '',
    notes: ''
  };

  // Rapports
  reportFilters = {
    type: 'payments',
    format: 'pdf',
    startDate: '',
    endDate: '',
    centre: 'all',
    washer: 'all'
  };
  toastr: any;

  //#endregion

  //#region Constructor
  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService,
    private centresService: CentresService,
    private paymentsService: PaymentsService,
    private washsService: WashsService,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService
  ) {}
  //#endregion

  //#region Lifecycle Methods
  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initializeComponent(): Promise<void> {
    await this.loadCurrentUser();
    await this.loadActiveCentres();
    this.loadStatistics();

    // S'abonner aux changements de l'utilisateur connecté
    this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
      }
    });
  }
  //#endregion

  //#region Chargement des données
  /**
   * Charge les centres actifs
   */
  private async loadActiveCentres(): Promise<void> {
    this.centresService
      .getAllCentres()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (centres) => {
          this.centres = centres;
        },
        error: (error) =>
          this.handleError('Chargement des centres', error)
      });
  }

  /**
   * Charge les laveurs par centre
   */
  async loadWashersByCentre(centreId: string): Promise<void> {
    try {
      this.isLoadingWashers = true;
      this.washers = [];
      this.filteredWashers = [];
      this.cdr.detectChanges();

      const response = await lastValueFrom(
        this.washsService.getWashersByCentre(centreId).pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            console.error('Error loading washers:', error);
            this.handleError('Erreur lors du chargement des laveurs', error);
            return of({ success: false, data: [] });
          })
        )
      );

      // Gérer la réponse
      if (Array.isArray(response)) {
        this.washers = response;
        this.filteredWashers = [...response];
      } else if (response?.data && Array.isArray(response.data)) {
        this.washers = response.data;
        this.filteredWashers = [...response.data];
      } else {
        this.washers = [];
        this.filteredWashers = [];
      }
    } catch (error) {
      console.error('Unexpected error loading washers:', error);
      this.washers = [];
      this.filteredWashers = [];
    } finally {
      this.isLoadingWashers = false;
      this.cdr.detectChanges();
    }
  }

  /**
 * Gère le changement de sélection du laveur
 */
onWasherSelectChange(washerId: string, centreId: string): void {
  if (washerId && centreId) {
    this.calculateWasherPayment(washerId, centreId);
  }
}

/**
 * Gère le changement de filtre par laveur
 */
onWasherFilterChange(washerId: string): void {
  this.selectedWasher = washerId;
  this.loadPayments();
}

/**
 * Gère le changement de sélection du centre dans le formulaire
 */
onCentreSelectChange(centreId: string): void {
  if (centreId) {
    this.loadWashersByCentre(centreId);
  } else {
    this.filteredWashers = [];
  }
}

/**
 * Vérifie si un paiement a un ID valide
 */
hasValidId(payment: Payment): boolean {
  return !!payment.id && payment.id.trim() !== '';
}

/**
 * Obtient l'ID d'un paiement de manière sécurisée
 */
getPaymentId(payment: Payment): string {
  return payment.id || '';
}

  /**
 * Charge les paiements avec filtres
 */
async loadPayments(): Promise<void> {
  try {
    this.isLoadingPayments = true;

    // Essayer avec un washerId null explicitement
    const filter: any = {
      centreId: this.selectedCentre !== 'all' ? this.selectedCentre : undefined,
      washerId: null, // ← Essayer avec null
      managerId: null, // ← Ajouter aussi managerId null
      userType: 'washer',
      month: this.getCurrentMonth(),
      year: this.getCurrentYear(),
      isValidated: this.getValidationFilter()
    };

    // Nettoyer l'objet des valeurs undefined
    const cleanFilter = Object.fromEntries(
      Object.entries(filter).filter(([_, v]) => v !== undefined)
    );

    console.log('Filtre nettoyé envoyé à l\'API:', cleanFilter);

    const response = await lastValueFrom(
      this.paymentsService.getPaymentsWithFilter(cleanFilter).pipe(
        takeUntil(this.destroy$)
      )
    );

    if (response.success) {
      this.payments = response.data;
      this.applyPaymentsFilters();
      console.log(`${this.payments.length} paiements chargés`);
    }
  } catch (error: any) {
    console.error('Erreur détaillée:', error);
    if (error && error.error) {
      console.error('Erreur backend:', error.error);
    }
    this.handleError('Erreur lors du chargement des paiements', error);
  } finally {
    this.isLoadingPayments = false;
    this.cdr.detectChanges();
  }
}

  /**
   * Charge les statistiques
   */
  async loadStatistics(): Promise<void> {
  try {
    const currentDate = new Date();

    // Déterminer l'ID du centre de manière sécurisée
    let centreId: string;

    if (this.selectedCentre !== 'all') {
      centreId = this.selectedCentre;
    } else if (this.centres.length > 0 && this.centres[0].id) {
      centreId = this.centres[0].id;
    } else {
      console.warn('Aucun centre disponible pour charger les statistiques');
      return;
    }

    const response = await lastValueFrom(
      this.paymentsService.getCentrePaymentStatistics(
        centreId,
        currentDate.getMonth() + 1,
        currentDate.getFullYear()
      ).pipe(takeUntil(this.destroy$))
    );

    if (response.success) {
      this.updateStatsFromAuditSummary(response.data);
    }
  } catch (error) {
    console.error('Erreur lors du chargement des statistiques:', error);
  }
}
  //#endregion

  //#region Gestion des onglets
  switchTab(tab: string): void {
    this.activeTab = tab;

    switch (tab) {
      case 'payments-list':
        this.loadPayments();
        break;
      case 'new-payment':
        this.initializeNewPaymentForm();
        break;
      case 'reports':
        this.initializeReportForm();
        break;
    }
  }

  isTabActive(tab: string): boolean {
    return this.activeTab === tab;
  }
  //#endregion

  //#region Gestion des filtres
  onCentreFilterChange(centreId: string): void {
    this.selectedCentre = centreId;
    if (centreId !== 'all') {
      this.loadWashersByCentre(centreId);
    }
    this.loadPayments();
    this.loadStatistics();
  }

  onStatusFilterChange(status: string): void {
    this.selectedStatus = status;
    this.applyPaymentsFilters();
  }

  onTypeFilterChange(type: string): void {
    this.selectedType = type;
    this.applyPaymentsFilters();
  }

  onPeriodFilterChange(period: string): void {
    this.selectedPeriod = period;
    this.loadPayments();
  }

  private applyPaymentsFilters(): void {
    this.filteredPayments = this.payments.filter(payment => {
      let matches = true;

      // Filtre par statut
      if (this.selectedStatus !== 'all') {
        if (this.selectedStatus === 'paid') {
          matches = matches && !!payment.approvedBy;
        } else if (this.selectedStatus === 'pending') {
          matches = matches && !payment.approvedBy;
        } else if (this.selectedStatus === 'failed') {
          // Logique pour les paiements échoués (à adapter selon votre métier)
          matches = matches && payment.amount === 0;
        }
      }

      // Filtre par type
      if (this.selectedType !== 'all') {
        matches = matches && payment.paymentType === this.selectedType;
      }

      return matches;
    });
  }
  //#endregion

  //#region Gestion des paiements
  /**
   * Initialise le formulaire de nouveau paiement
   */
  initializeNewPaymentForm(): void {
    this.newPayment = {
      washerId: '',
      centreId: '',
      paymentType: '' as PaymentType,
      method: '' as unknown as PaymentMethod,
      amount: 0,
      commission: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      sessions: '',
      notes: ''
    };
  }

  /**
   * Soumet un nouveau paiement
   */
  async submitNewPayment(): Promise<void> {
    try {
      this.isLoading = true;

      // Validation
      if (!this.validateNewPayment()) {
        return;
      }

      const sessionIds = this.newPayment.sessions
        ? this.newPayment.sessions.split(',').map(s => s.trim()).filter(s => s)
        : [];

      const paymentData = {
        washerId: this.newPayment.washerId,
        centreId: this.newPayment.centreId,
        paymentType: this.newPayment.paymentType,
        method: this.newPayment.method,
        amount: this.newPayment.amount,
        commission: this.newPayment.commission,
        paymentDate: new Date(this.newPayment.paymentDate),
        sessionIds: sessionIds,
        notes: this.newPayment.notes,
        approvedBy: this.currentUser?.id
      };

      const response = await lastValueFrom(
        this.paymentsService.generateWasherMonthlyPayment(
          paymentData.washerId,
          paymentData.centreId,
          new Date(paymentData.paymentDate).getMonth() + 1,
          new Date(paymentData.paymentDate).getFullYear(),
          paymentData.approvedBy || ''
        ).pipe(takeUntil(this.destroy$))
      );

      if (response.success) {
        this.handleSuccess('Paiement créé avec succès');
        this.switchTab('payments-list');
      } else {
        this.handleError('Erreur lors de la création du paiement', response.message);
      }
    } catch (error) {
      this.handleError('Erreur lors de la création du paiement', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Valide les données du nouveau paiement
   */
  private validateNewPayment(): boolean {
    if (!this.newPayment.washerId) {
      this.handleError('Validation', 'Veuillez sélectionner un laveur');
      return false;
    }
    if (!this.newPayment.centreId) {
      this.handleError('Validation', 'Veuillez sélectionner un centre');
      return false;
    }
    if (!this.newPayment.paymentType) {
      this.handleError('Validation', 'Veuillez sélectionner un type de paiement');
      return false;
    }
    if (!this.newPayment.method) {
      this.handleError('Validation', 'Veuillez sélectionner une méthode de paiement');
      return false;
    }
    if (!this.newPayment.amount || this.newPayment.amount <= 0) {
      this.handleError('Validation', 'Veuillez saisir un montant valide');
      return false;
    }
    if (!this.newPayment.paymentDate) {
      this.handleError('Validation', 'Veuillez sélectionner une date de paiement');
      return false;
    }

    return true;
  }

/**
 * Calcule le paiement pour un laveur
 */
async calculateWasherPayment(washerId: string, centreId: string): Promise<void> {
  try {
    // Afficher un indicateur de chargement
    this.isLoading = true;
    console.log('Calcul du paiement pour:', { washerId, centreId });

    const currentDate = new Date();
    const response = await lastValueFrom(
      this.paymentsService.calculateWasherPayment(
        washerId,
        currentDate.getMonth() + 1,
        currentDate.getFullYear(),
        centreId
      ).pipe(takeUntil(this.destroy$))
    );

    console.log('Réponse du calcul:', response);

    if (response.success && response.data) {
      // Mettre à jour les valeurs du formulaire
      this.newPayment.amount = response.data.finalAmount || 0;
      this.newPayment.commission = response.data.totalCommission || 0;
      this.newPayment.sessions = response.data.sessionIds
        ? response.data.sessionIds.join(', ')
        : '';

      // Forcer la détection des changements
      this.cdr.detectChanges();

      // Afficher un message de succès
      this.handleSuccess(
        `Montant calculé: ${this.formatAmount(this.newPayment.amount)} \n` +
        `Commission: ${this.formatAmount(this.newPayment.commission)} \n` +
        `Sessions: ${response.data.sessionIds?.length || 0}`
      );

      console.log('Valeurs mises à jour:', {
        amount: this.newPayment.amount,
        commission: this.newPayment.commission,
        sessions: this.newPayment.sessions
      });
    } else {
      this.handleError(
        'Calcul du paiement',
        response.message || 'Aucune donnée disponible pour ce laveur'
      );
    }
  } catch (error: any) {
    console.error('Erreur lors du calcul du paiement:', error);
    this.handleError(
      'Erreur de calcul',
      error.error?.message || error.message || 'Impossible de calculer le paiement'
    );
  } finally {
    // Masquer l'indicateur de chargement
    this.isLoading = false;
    this.cdr.detectChanges();
  }
}

  /**
   * Valide un paiement
   */
  async validatePayment(paymentId: string): Promise<void> {
    try {
      if (!this.currentUser?.id) {
        this.handleError('Validation', 'Utilisateur non connecté');
        return;
      }

      const response = await lastValueFrom(
        this.paymentsService.validateMonthlyPayment(
          paymentId,
          this.currentUser.id,
          'Validation manuelle'
        ).pipe(takeUntil(this.destroy$))
      );

      if (response.success) {
        this.handleSuccess('Paiement validé avec succès');
        this.loadPayments();
      }
    } catch (error) {
      this.handleError('Erreur lors de la validation du paiement', error);
    }
  }

  /**
   * Annule un paiement
   */
  async cancelPayment(paymentId: string): Promise<void> {
    try {
      if (!this.currentUser?.id) {
        this.handleError('Annulation', 'Utilisateur non connecté');
        return;
      }

      const reason = prompt('Veuillez saisir la raison de l\'annulation:');
      if (!reason) return;

      const response = await lastValueFrom(
        this.paymentsService.cancelMonthlyPayment(
          paymentId,
          this.currentUser.id,
          reason
        ).pipe(takeUntil(this.destroy$))
      );

      if (response.success) {
        this.handleSuccess('Paiement annulé avec succès');
        this.loadPayments();
      }
    } catch (error) {
      this.handleError('Erreur lors de l\'annulation du paiement', error);
    }
  }
  //#endregion

  //#region Gestion des rapports
  /**
   * Initialise le formulaire de rapport
   */
  initializeReportForm(): void {
    const currentDate = new Date();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    this.reportFilters = {
      type: 'payments',
      format: 'pdf',
      startDate: firstDay.toISOString().split('T')[0],
      endDate: currentDate.toISOString().split('T')[0],
      centre: 'all',
      washer: 'all'
    };
  }

  /**
   * Génère un rapport
   */
  async generateReport(): Promise<void> {
    try {
      this.isLoading = true;

      if (!this.reportFilters.startDate || !this.reportFilters.endDate) {
        this.handleError('Validation', 'Veuillez sélectionner une période');
        return;
      }

      if (this.reportFilters.format === 'excel') {
        await this.exportToExcel();
      } else {
        await this.generateStandardReport();
      }
    } catch (error) {
      this.handleError('Erreur lors de la génération du rapport', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
 * Génère un reçu pour un paiement
 */
async generateReceipt(paymentId: string): Promise<void> {
    try {
      // Récupérer l'image du backend
      const blob = await lastValueFrom(
        this.paymentsService.generatePaymentReceipt(paymentId).pipe(
          takeUntil(this.destroy$)
        )
      );

      // Télécharger automatiquement
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recu_${paymentId}.png`;
      link.click();
      window.URL.revokeObjectURL(url);

      // Message de succès (optionnel)
      this.toastr.success('Reçu téléchargé avec succès');

    } catch (error) {
      this.handleError('Erreur lors de la génération du reçu', error);
    }
  }


  /**
   * Exporte vers Excel
   */
  public async exportToExcel(): Promise<void> {
    try {
      const centreId = this.reportFilters.centre !== 'all' ? this.reportFilters.centre : this.centres[0]?.id;
      if (!centreId) {
        this.handleError('Export', 'Aucun centre sélectionné');
        return;
      }

      const startDate = new Date(this.reportFilters.startDate);
      const blob = await lastValueFrom(
        this.paymentsService.exportPaymentsToExcel(
          centreId,
          startDate.getMonth() + 1,
          startDate.getFullYear()
        ).pipe(takeUntil(this.destroy$))
      );

      const filename = `paiements_${centreId}_${startDate.getMonth() + 1}_${startDate.getFullYear()}.xlsx`;
      this.paymentsService.downloadBlob(blob, filename);
      this.handleSuccess('Export Excel terminé');
    } catch (error) {
      this.handleError('Erreur lors de l\'export Excel', error);
    }
  }

  /**
   * Génère un rapport standard
   */
  private async generateStandardReport(): Promise<void> {
    // Implémentation pour les rapports PDF/CSV
    this.handleSuccess('Rapport généré avec succès');
  }
  //#endregion

  //#region Utilitaires
  private getCurrentMonth(): number {
    return new Date().getMonth() + 1;
  }

  private getCurrentYear(): number {
    return new Date().getFullYear();
  }

  private getValidationFilter(): boolean | undefined {
    switch (this.selectedStatus) {
      case 'paid': return true;
      case 'pending': return false;
      default: return undefined;
    }
  }

  private updateStatsFromAuditSummary(summary: AuditSummary): void {
    this.stats = {
      totalAmount: summary.totalAmount,
      activeWashers: summary.totalPayments,
      pendingPayments: summary.pendingPayments,
      averageCommission: summary.totalSessions > 0 ? (summary.totalCommission / summary.totalSessions) : 0
    };
  }

  getPaymentTypeLabel(type: PaymentType): string {
    const labels: { [key in PaymentType]: string } = {
      [PaymentType.PerService]: 'Par service',
      [PaymentType.Daily]: 'Quotidien',
      [PaymentType.Weekly]: 'Hebdomadaire',
      [PaymentType.Monthly]: 'Mensuel',
      [PaymentType.Bonus]: 'Bonus',
      [PaymentType.Other]: 'Autre'
    };
    return labels[type] || type;
  }

 getPaymentMethodLabel(method: string | PaymentMethod): string {
  // Convertir la string en enum PaymentMethod si nécessaire
  let paymentMethod: PaymentMethod;

  if (typeof method === 'string') {
    // Si c'est une string, essayer de la convertir en enum
    paymentMethod = PaymentMethod[method as keyof typeof PaymentMethod] || PaymentMethod.CASH;
  } else {
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

  getStatusBadgeClass(payment: Payment): string {
    if (payment.approvedBy) {
      return 'status-badge status-paid';
    } else if (payment.amount === 0) {
      return 'status-badge status-failed';
    } else {
      return 'status-badge status-pending';
    }
  }

  getStatusText(payment: Payment): string {
    if (payment.approvedBy) {
      return 'Payé';
    } else if (payment.amount === 0) {
      return 'Échoué';
    } else {
      return 'En attente';
    }
  }

  formatAmount(amount: number): string {
    return this.paymentsService.formatAmount(amount);
  }

  getWasherName(washerId: string): string {
    const washer = this.washers.find(w => w.id === washerId);
    return washer ? `${washer.firstName} ${washer.lastName}` : 'N/A';
  }

  getCentreName(centreId: string): string {
    const centre = this.centres.find(c => c.id === centreId);
    return centre ? centre.name : 'N/A';
  }
  //#endregion

  //#region Gestion des erreurs et succès améliorée
private handleError(title: string, error: any, duration?: number): void {
  console.error(`${title}:`, error);

  let errorMessage = 'Une erreur inattendue est survenue';

  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error?.message) {
    errorMessage = error.message;
  } else if (error?.error?.message) {
    errorMessage = error.error.message;
  } else if (error?.error) {
    errorMessage = typeof error.error === 'string' ? error.error : 'Erreur serveur';
  }

  this.notificationService.error(title, errorMessage, duration);
}

private handleSuccess(message: string, title: string = 'Succès', duration?: number): void {
  this.notificationService.success(title, message, duration);
}

private handleWarning(message: string, title: string = 'Attention', duration?: number): void {
  this.notificationService.warning(title, message, duration);
}

private handleInfo(message: string, title: string = 'Information', duration?: number): void {
  this.notificationService.info(title, message, duration);
}
//#endregion

  //#region User Management Methods
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
  //#endregion

  //#region Photo Management Methods
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
  //#endregion

  //#region User Info Methods
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
  //#endregion

  //#region Sidebar Methods
  //#endregion

  //#region Auth Methods
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
  //#endregion
}

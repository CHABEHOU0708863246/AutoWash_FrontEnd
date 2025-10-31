import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { catchError, lastValueFrom, of, Subject, takeUntil } from 'rxjs';
import { Centres } from '../../../core/models/Centres/Centres';
import { Payment } from '../../../core/models/Payments/Payment';
import { PaymentMethod } from '../../../core/models/Payments/PaymentMethod';
import { PaymentType } from '../../../core/models/Payments/PaymentType';
import { WasherPaymentSummary } from '../../../core/models/Payments/WasherPaymentSummary';
import { Users } from '../../../core/models/Users/Users';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { NotificationService } from '../../../core/services/Notification/notification.service';
import { PaymentsService } from '../../../core/services/Payments/payments.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { WashsService } from '../../../core/services/Washs/washs.service';
import { ManagerPaymentSummary } from '../../../core/models/Payments/ManagerPaymentSummary';
import { ApiResponseData } from '../../../core/models/ApiResponseData';

@Component({
  selector: 'app-payments-managers',
  imports: [RouterLink, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './payments-managers.component.html',
  styleUrl: './payments-managers.component.scss',
})
export class PaymentsManagersComponent implements OnInit, OnDestroy {
  //#region Properties
  private destroy$ = new Subject<void>();
  displayedUsers: Users[] = [];
  PaymentMethod = PaymentMethod;
  selectedCentreManager: Users | null = null;

  // Données principales
  users: Users[] = [];
  currentUser: Users | null = null;

  // Centres et managers
  centres: Centres[] = [];
  managers: Users[] = [];
  filteredManagers: Users[] = [];

  // Paiements
  payments: Payment[] = [];
  filteredPayments: Payment[] = [];
  paymentSummaries: ManagerPaymentSummary[] = [];

  // Statistiques
  stats = {
    totalSalary: 0,
    totalCommission: 0,
    activeManagers: 0,
    commissionRate: 0,
  };

  // Filtres
  selectedCentre: string = 'all';
  selectedManager: string = 'all';
  selectedStatus: string = 'all';
  selectedPeriod: string = 'current';

  // États de chargement
  isLoading = false;
  isLoadingManagers = false;
  isLoadingPayments = false;

  // Onglets
  activeTab: string = 'payments-list';

  // Formulaire nouveau paiement manager
  newManagerPayment = {
    managerId: '',
    centreId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    baseSalary: 0,
    commissionRate: 0,
    commission: 0,
    bonus: 0,
    method: '' as unknown as PaymentMethod,
    bankAccount: '',
    mobileNumber: '',
    notes: '',
  };

  // Rapports
  reportFilters = {
    type: 'payments',
    format: 'pdf',
    startDate: '',
    endDate: '',
    centre: 'all',
    manager: 'all',
  };

  // Utilitaires
  months = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ];
  years: number[] = [];

  //#endregion

  //#region Constructor
  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService,
    private centresService: CentresService,
    private paymentsService: PaymentsService,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService
  ) {
    this.generateYears();
  }
  //#endregion

  //#region Utilitaires
  private generateYears(): void {
  const currentYear = new Date().getFullYear();
  this.years = [];

  // Générer les 3 années précédentes et les 3 années suivantes
  for (let year = currentYear - 3; year <= currentYear + 3; year++) {
    this.years.push(year);
  }
}

getCurrentYear(): number {
  return new Date().getFullYear();
}

getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}
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

    // Initialiser avec le premier centre si disponible
    if (this.centres.length > 0 && this.centres[0].id) {
      this.selectedCentre = this.centres[0].id;
      await this.loadManagersByCentre(this.selectedCentre);
    } else {
      // Si aucun centre valide, utiliser 'all' comme valeur par défaut
      this.selectedCentre = 'all';
    }

    this.loadStatistics();
    this.loadPayments();

    this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
      }
    });
  }
  //#endregion

  //#region Chargement des données
  private async loadActiveCentres(): Promise<void> {
    this.centresService
      .getAllCentres()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (centres) => {
          this.centres = centres;
        },
        error: (error) => this.handleError('Chargement des centres', error),
      });
  }

  //#region Méthodes d'adaptation pour les managers
  getManagerBaseSalary(payment: Payment): number {
    // Pour les managers, le salaire de base est dans amount
    return payment.isManagerPayment ? payment.amount : 0;
  }

  getManagerBonus(payment: Payment): number {
    // Pour les managers, le bonus est dans commission
    return payment.isManagerPayment ? payment.commission : 0;
  }

  getManagerTotalAmount(payment: Payment): number {
    return payment.getTotalAmount();
  }

  getManagerPeriodMonth(payment: Payment): number {
    // Extraire le mois de la date de paiement
    return payment.paymentDate.getMonth() + 1;
  }

  getManagerPeriodYear(payment: Payment): number {
    // Extraire l'année de la date de paiement
    return payment.paymentDate.getFullYear();
  }

  getManagerStatus(payment: Payment): string {
    return payment.approvedBy ? 'approved' : 'pending';
  }
  //#endregion

  async loadManagersByCentre(centreId: string): Promise<void> {
    try {
      this.isLoadingManagers = true;
      this.managers = [];
      this.filteredManagers = [];
      this.cdr.detectChanges();

      // Utiliser centresService au lieu de usersService
      const response = await lastValueFrom(
        this.centresService.getAvailableManagers().pipe(
          takeUntil(this.destroy$),
          catchError((error: any) => {
            console.error('Error loading managers:', error);
            this.handleError('Erreur lors du chargement des managers', error);
            return of([]);
          })
        )
      );

      // Filtrer les managers disponibles et ajouter le manager actuel du centre si nécessaire
      let availableManagers = Array.isArray(response) ? response : [];

      // Récupérer le centre sélectionné pour obtenir son manager actuel
      const selectedCentre = this.centres.find((c) => c.id === centreId);
      if (selectedCentre && selectedCentre.ownerId) {
        // Vérifier si le manager actuel n'est pas déjà dans la liste
        const currentManager = availableManagers.find(
          (m) => m.id === selectedCentre.ownerId
        );
        if (!currentManager) {
          // Si le manager actuel n'est pas dans availableManagers, on peut le récupérer via usersService
          try {
            const managerUser = await lastValueFrom(
              this.usersService
                .getUserById(selectedCentre.ownerId)
                .pipe(takeUntil(this.destroy$))
            );
            if (managerUser && managerUser.id) {
              availableManagers.push(managerUser);
            }
          } catch (error) {
            console.warn('Impossible de récupérer le manager actuel:', error);
          }
        }
      }

      this.managers = availableManagers;
      this.filteredManagers = [...availableManagers];

      console.log(
        'Managers chargés pour le centre',
        centreId,
        ':',
        this.managers
      );
    } catch (error) {
      console.error('Unexpected error loading managers:', error);
      this.managers = [];
      this.filteredManagers = [];
      this.handleError(
        'Erreur inattendue lors du chargement des managers',
        error
      );
    } finally {
      this.isLoadingManagers = false;
      this.cdr.detectChanges();
    }
  }
  async loadPayments(): Promise<void> {
    try {
      this.isLoadingPayments = true;

      const filter: any = {
        centreId:
          this.selectedCentre !== 'all' ? this.selectedCentre : undefined,
        managerId:
          this.selectedManager !== 'all' ? this.selectedManager : undefined,
        userType: 'manager',
        month: this.getCurrentMonth(),
        year: this.getCurrentYear(),
        isValidated: this.getValidationFilter(),
      };

      const cleanFilter = Object.fromEntries(
        Object.entries(filter).filter(([_, v]) => v !== undefined)
      );

      const response = await lastValueFrom(
        this.paymentsService
          .getPaymentsWithFilter(cleanFilter)
          .pipe(takeUntil(this.destroy$))
      );

      if (response.success) {
        this.payments = response.data;
        this.applyPaymentsFilters();
      }
    } catch (error: any) {
      console.error('Erreur détaillée:', error);
      this.handleError('Erreur lors du chargement des paiements', error);
    } finally {
      this.isLoadingPayments = false;
      this.cdr.detectChanges();
    }
  }

  async loadStatistics(): Promise<void> {
    try {
      const currentDate = new Date();
      let centreId: string;

      if (this.selectedCentre !== 'all') {
        centreId = this.selectedCentre;
      } else if (this.centres.length > 0 && this.centres[0].id) {
        centreId = this.centres[0].id;
      } else {
        console.warn('Aucun centre disponible pour charger les statistiques');
        return;
      }

      // Implémentation spécifique aux managers
      this.updateManagerStats();
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  }

  private updateManagerStats(): void {
    // Logique de calcul des statistiques pour les managers
    const managerPayments = this.payments.filter(
      (p) => p.userId && this.managers.some((m) => m.id === p.userId)
    );

    this.stats = {
      totalSalary: managerPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      totalCommission: managerPayments.reduce(
        (sum, p) => sum + (p.commission || 0),
        0
      ),
      activeManagers: new Set(managerPayments.map((p) => p.userId)).size,
      commissionRate:
        managerPayments.length > 0
          ? (managerPayments.reduce((sum, p) => sum + (p.commission || 0), 0) /
              managerPayments.reduce((sum, p) => sum + (p.amount || 0), 0)) *
            100
          : 0,
    };
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
        this.initializeManagerPaymentForm();
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
  this.selectedManager = 'all';
  this.selectedCentreManager = null;

  if (centreId !== 'all') {
    // Récupérer le manager du centre sélectionné
    const centre = this.centres.find(c => c.id === centreId);
    if (centre && centre.ownerId) {
      // Charger les informations du manager
      this.usersService.getUserById(centre.ownerId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (manager) => {
            if (manager) {
              this.selectedCentreManager = manager;
              this.selectedManager = manager.id || 'all';
              this.managers = [manager]; // Un seul manager dans la liste
              this.filteredManagers = [manager];
            } else {
              this.selectedCentreManager = null;
              this.selectedManager = 'all';
              this.managers = [];
              this.filteredManagers = [];
            }
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Erreur lors du chargement du manager:', error);
            this.managers = [];
            this.filteredManagers = [];
          }
        });
    }
  } else {
    this.managers = [];
    this.filteredManagers = [];
  }

  this.loadPayments();
  this.loadStatistics();
}

  onManagerFilterChange(managerId: string): void {
    this.selectedManager = managerId;
    this.loadPayments();
  }

  onStatusFilterChange(status: string): void {
    this.selectedStatus = status;
    this.applyPaymentsFilters();
  }

  onPeriodFilterChange(period: string): void {
    this.selectedPeriod = period;
    this.loadPayments();
  }

  private applyPaymentsFilters(): void {
    this.filteredPayments = this.payments.filter((payment) => {
      let matches = true;

      if (this.selectedStatus !== 'all') {
        if (this.selectedStatus === 'approved') {
          matches = matches && !!payment.approvedBy;
        } else if (this.selectedStatus === 'pending') {
          matches = matches && !payment.approvedBy;
        } else if (this.selectedStatus === 'rejected') {
          matches = matches && payment.amount === 0;
        }
      }

      return matches;
    });
  }
  //#endregion

  //#region Gestion des paiements managers
  onManagerCentreSelectChange(centreId: string): void {
  if (centreId) {
    const centre = this.centres.find(c => c.id === centreId);
    if (centre && centre.ownerId) {
      // Charger les informations du manager du centre
      this.isLoadingManagers = true;
      this.usersService.getUserById(centre.ownerId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (manager) => {
            if (manager) {
              this.selectedCentreManager = manager;
              this.filteredManagers = [manager];
              // Assigner automatiquement le manager
              this.newManagerPayment.managerId = manager.id || '';
            } else {
              this.selectedCentreManager = null;
              this.filteredManagers = [];
              this.newManagerPayment.managerId = '';
            }
            this.isLoadingManagers = false;
            // Calculer automatiquement après sélection
            if (this.newManagerPayment.managerId) {
              this.calculateManagerPayment();
            }
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Erreur lors du chargement du manager:', error);
            this.filteredManagers = [];
            this.selectedCentreManager = null;
            this.isLoadingManagers = false;
            this.handleError('Erreur', 'Impossible de charger le manager de ce centre');
            this.cdr.detectChanges();
          }
        });
    } else {
      this.filteredManagers = [];
      this.selectedCentreManager = null;
      this.newManagerPayment.managerId = '';
      this.handleError('Erreur', 'Ce centre n\'a pas de manager assigné');
    }
  } else {
    this.filteredManagers = [];
    this.selectedCentreManager = null;
    this.newManagerPayment.managerId = '';
  }
}

getManagerFullName(managerId: string): string {
  const manager = this.managers.find(m => m.id === managerId);
  return manager ? `${manager.firstName} ${manager.lastName}` : 'Manager non trouvé';
}

  onManagerSelectChange(managerId: string): void {
    if (managerId && this.newManagerPayment.centreId) {
      this.calculateManagerPayment();
    }
  }

  initializeManagerPaymentForm(): void {
  this.newManagerPayment = {
    managerId: '',
    centreId: '',
    month: this.getCurrentMonth(), // Mois courant
    year: this.getCurrentYear(),   // Année courante
    baseSalary: 0,
    commissionRate: 0,
    commission: 0,
    bonus: 0,
    method: undefined as unknown as PaymentMethod,
    bankAccount: '',
    mobileNumber: '',
    notes: '',
  };
}

  async submitManagerPayment(): Promise<void> {
    try {
      this.isLoading = true;

      if (!this.validateManagerPayment()) {
        return;
      }

      const paymentData = {
        managerId: this.newManagerPayment.managerId,
        centreId: this.newManagerPayment.centreId,
        month: this.newManagerPayment.month,
        year: this.newManagerPayment.year,
        baseSalary: this.newManagerPayment.baseSalary,
        commission: this.newManagerPayment.commission,
        bonus: this.newManagerPayment.bonus,
        method: this.newManagerPayment.method,
        notes: this.newManagerPayment.notes,
        approvedBy: this.currentUser?.id,
      };

      const response = await lastValueFrom(
        this.paymentsService
          .generateManagerMonthlyPayment(
            paymentData.managerId,
            paymentData.centreId,
            paymentData.month,
            paymentData.year,
            paymentData.approvedBy || ''
          )
          .pipe(takeUntil(this.destroy$))
      );

      if (response.success) {
        this.handleSuccess('Paiement manager créé avec succès');
        this.switchTab('payments-list');
      } else {
        this.handleError(
          'Erreur lors de la création du paiement',
          response.message
        );
      }
    } catch (error) {
      this.handleError('Erreur lors de la création du paiement', error);
    } finally {
      this.isLoading = false;
    }
  }

  private validateManagerPayment(): boolean {
    if (!this.newManagerPayment.managerId) {
      this.handleError('Validation', 'Veuillez sélectionner un manager');
      return false;
    }
    if (!this.newManagerPayment.centreId) {
      this.handleError('Validation', 'Veuillez sélectionner un centre');
      return false;
    }
    if (!this.newManagerPayment.month) {
      this.handleError('Validation', 'Veuillez sélectionner un mois');
      return false;
    }
    if (!this.newManagerPayment.year) {
      this.handleError('Validation', 'Veuillez sélectionner une année');
      return false;
    }
    if (!this.newManagerPayment.method) {
      this.handleError(
        'Validation',
        'Veuillez sélectionner une méthode de paiement'
      );
      return false;
    }

    return true;
  }

  async calculateManagerPayment(): Promise<void> {
    try {
      this.isLoading = true;

      if (
        !this.newManagerPayment.managerId ||
        !this.newManagerPayment.centreId
      ) {
        this.handleError(
          'Calcul',
          'Veuillez sélectionner un manager et un centre'
        );
        return;
      }

      const response = await lastValueFrom(
        this.paymentsService
          .calculateManagerPayment(
            this.newManagerPayment.managerId,
            this.newManagerPayment.month,
            this.newManagerPayment.year,
            this.newManagerPayment.centreId
          )
          .pipe(takeUntil(this.destroy$))
      );

      if (response.success && response.data) {
        // Utiliser les propriétés existantes du modèle ManagerPaymentSummary
        this.newManagerPayment.baseSalary = response.data.baseSalary || 0;

        // Calculer la commission à partir des autres propriétés disponibles
        // Par exemple, utiliser centrePerformanceBonus comme commission
        this.newManagerPayment.commission =
          response.data.centrePerformanceBonus || 0;

        // Calculer le taux de commission basé sur le salaire de base
        this.newManagerPayment.commissionRate =
          response.data.baseSalary > 0
            ? ((response.data.centrePerformanceBonus || 0) /
                response.data.baseSalary) *
              100
            : 0;

        // Mettre à jour le bonus avec bonusAmount
        this.newManagerPayment.bonus = response.data.bonusAmount || 0;

        this.cdr.detectChanges();
        this.handleSuccess('Calcul du paiement manager terminé');
      } else {
        this.handleError(
          'Calcul du paiement',
          response.message || 'Aucune donnée disponible'
        );
      }
    } catch (error: any) {
      console.error('Erreur lors du calcul du paiement manager:', error);
      this.handleError(
        'Erreur de calcul',
        error.error?.message ||
          error.message ||
          'Impossible de calculer le paiement'
      );
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
  calculateManagerTotal(): number {
    return (
      this.newManagerPayment.baseSalary +
      this.newManagerPayment.commission +
      this.newManagerPayment.bonus
    );
  }

  resetManagerForm(): void {
    this.initializeManagerPaymentForm();
  }

  async approvePayment(paymentId: string): Promise<void> {
    try {
      if (!this.currentUser?.id) {
        this.handleError('Validation', 'Utilisateur non connecté');
        return;
      }

      const response = await lastValueFrom(
        this.paymentsService
          .validateMonthlyPayment(
            paymentId,
            this.currentUser.id,
            'Validation manuelle manager'
          )
          .pipe(takeUntil(this.destroy$))
      );

      if (response.success) {
        this.handleSuccess('Paiement manager validé avec succès');
        this.loadPayments();
      }
    } catch (error) {
      this.handleError('Erreur lors de la validation du paiement', error);
    }
  }

  async rejectPayment(paymentId: string): Promise<void> {
    try {
      if (!this.currentUser?.id) {
        this.handleError('Rejet', 'Utilisateur non connecté');
        return;
      }

      const reason = prompt('Veuillez saisir la raison du rejet:');
      if (!reason) return;

      // Implémentation spécifique pour le rejet des paiements managers
      this.handleSuccess('Paiement manager rejeté avec succès');
      this.loadPayments();
    } catch (error) {
      this.handleError('Erreur lors du rejet du paiement', error);
    }
  }

  viewPaymentDetails(paymentId: string): void {
    // Navigation vers les détails du paiement
    this.router.navigate(['/payments', paymentId]);
  }

  async generateReceipt(paymentId: string): Promise<void> {
    try {
      const blob = await lastValueFrom(
        this.paymentsService
          .generatePaymentReceipt(paymentId)
          .pipe(takeUntil(this.destroy$))
      );

      // Télécharger automatiquement le blob
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Déterminer le nom du fichier selon le type de contenu
      let filename = `recu_paiement_${paymentId}`;

      // Vérifier le type MIME pour l'extension
      if (blob.type.includes('pdf')) {
        filename += '.pdf';
      } else if (blob.type.includes('word') || blob.type.includes('document')) {
        filename += '.docx';
      } else if (blob.type.includes('png')) {
        filename += '.png';
      } else if (blob.type.includes('jpeg') || blob.type.includes('jpg')) {
        filename += '.jpg';
      } else {
        filename += '.txt';
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.handleSuccess('Reçu généré et téléchargé avec succès');
    } catch (error) {
      this.handleError('Erreur lors de la génération du reçu', error);
    }
  }
  //#endregion

  //#region Gestion des rapports
  initializeReportForm(): void {
    const currentDate = new Date();
    const firstDay = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );

    this.reportFilters = {
      type: 'payments',
      format: 'pdf',
      startDate: firstDay.toISOString().split('T')[0],
      endDate: currentDate.toISOString().split('T')[0],
      centre: 'all',
      manager: 'all',
    };
  }

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

  async exportToExcel(): Promise<void> {
    try {
      const centreId =
        this.reportFilters.centre !== 'all'
          ? this.reportFilters.centre
          : this.centres[0]?.id;
      if (!centreId) {
        this.handleError('Export', 'Aucun centre sélectionné');
        return;
      }

      const startDate = new Date(this.reportFilters.startDate);
      const blob = await lastValueFrom(
        this.paymentsService
          .exportPaymentsToExcel(
            centreId,
            startDate.getMonth() + 1,
            startDate.getFullYear()
          )
          .pipe(takeUntil(this.destroy$))
      );

      const filename = `paiements_managers_${centreId}_${
        startDate.getMonth() + 1
      }_${startDate.getFullYear()}.xlsx`;
      this.paymentsService.downloadBlob(blob, filename);
      this.handleSuccess('Export Excel terminé');
    } catch (error) {
      this.handleError("Erreur lors de l'export Excel", error);
    }
  }

  private async generateStandardReport(): Promise<void> {
    this.handleSuccess('Rapport managers généré avec succès');
  }
  //#endregion

  //#region Utilitaires

  private getValidationFilter(): boolean | undefined {
    switch (this.selectedStatus) {
      case 'approved':
        return true;
      case 'pending':
        return false;
      default:
        return undefined;
    }
  }

  getPaymentTypeLabel(type: PaymentType): string {
    const labels: { [key in PaymentType]: string } = {
      [PaymentType.PerService]: 'Par service',
      [PaymentType.Daily]: 'Quotidien',
      [PaymentType.Weekly]: 'Hebdomadaire',
      [PaymentType.Monthly]: 'Mensuel',
      [PaymentType.Quarterly]: 'Trimestriel', // Ajout de la valeur manquante
      [PaymentType.Bonus]: 'Bonus',
      [PaymentType.Other]: 'Autre',
    };
    return labels[type] || type.toString();
  }

  getStatusBadgeClass(payment: Payment): string {
    if (payment.approvedBy) {
      return 'status-badge status-approved';
    } else if (payment.amount === 0) {
      return 'status-badge status-rejected';
    } else {
      return 'status-badge status-pending';
    }
  }

  getStatusIcon(payment: Payment): string {
    if (payment.approvedBy) {
      return 'fas fa-check-circle';
    } else if (payment.amount === 0) {
      return 'fas fa-times-circle';
    } else {
      return 'fas fa-clock';
    }
  }

  getStatusText(payment: Payment): string {
    if (payment.approvedBy) {
      return 'Approuvé';
    } else if (payment.amount === 0) {
      return 'Rejeté';
    } else {
      return 'En attente';
    }
  }

  formatAmount(amount: number): string {
    return this.paymentsService.formatAmount(amount);
  }

  getManagerName(managerId: string): string {
    const manager = this.managers.find((m) => m.id === managerId);
    return manager ? `${manager.firstName} ${manager.lastName}` : 'N/A';
  }

  getManagerEmail(managerId: string): string {
    const manager = this.managers.find((m) => m.id === managerId);
    return manager?.email || 'N/A'; // Utiliser l'opérateur optional chaining
  }

  getCentreName(centreId: string): string {
    const centre = this.centres.find((c) => c.id === centreId);
    return centre ? centre.name : 'N/A';
  }
  //#endregion

  //#region Gestion des erreurs et succès
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
      errorMessage =
        typeof error.error === 'string' ? error.error : 'Erreur serveur';
    }

    this.notificationService.error(title, errorMessage, duration);
  }

  private handleSuccess(
    message: string,
    title: string = 'Succès',
    duration?: number
  ): void {
    this.notificationService.success(title, message, duration);
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

  //#region Auth Methods
  /**
   * Déconnecte l'utilisateur et le redirige vers la page de connexion.
   */
  logout(): void {
    // Vérifie si l'utilisateur est bien authentifié avant de le déconnecter
    if (this.authService.isAuthenticated()) {
      try {
        // Log l'état du localStorage avant la déconnexion (pour debug)
        console.log('État du localStorage avant déconnexion:', {});

        // Appel au service de déconnexion
        this.authService.logout();

        // Vérifie que le localStorage a bien été vidé
        console.log('État du localStorage après déconnexion:', {});

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

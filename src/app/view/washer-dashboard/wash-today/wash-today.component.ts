import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { catchError, finalize, forkJoin, of, Subscription } from 'rxjs';

// Services
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { WashsService } from '../../../core/services/Washs/washs.service';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { ServiceSettingsService } from '../../../core/services/ServiceSettings/service-settings.service';

// Models
import { Users } from '../../../core/models/Users/Users';
import { WashSession } from '../../../core/models/Wash/WashSession';
import { Centres } from '../../../core/models/Centres/Centres';
import { ServiceSettings } from '../../../core/models/Settings/Services/ServiceSettings';
import { ApiResponseData } from '../../../core/models/ApiResponseData';

@Component({
  selector: 'app-wash-today',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './wash-today.component.html',
  styleUrl: './wash-today.component.scss',
})
export class WashTodayComponent implements OnInit, OnDestroy {
  //#region Properties

  // Utilisateur courant (le laveur)
  currentUser: Users | null = null;
  currentCentre: Centres | null = null;
  isSidebarCollapsed = false;
  Math = Math;

  // Sessions de lavage du laveur
  washerSessions: WashSession[] = [];
  filteredSessions: WashSession[] = [];
  todaySessions: WashSession[] = [];
  isLoading = false;

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;

  // Filtres
  searchTerm = '';
  selectedDateFilter = 'today'; // today, week, month, all
  selectedStatusFilter = 'all'; // all, completed, cancelled, inprogress
  startDate: string = '';
  endDate: string = '';

  // Services et centres
  services: ServiceSettings[] = [];
  centres: Centres[] = [];

  // Statistiques du laveur
  washerStats = {
    totalSessionsToday: 0,
    totalSessionsWeek: 0,
    totalRevenueToday: 0,
    totalRevenueWeek: 0,
    completionRate: 0,
    averageRating: 0,
    averageDuration: 0,
    commissionToday: 0,
    commissionWeek: 0,
    commissionRate: 30,
  };

  // Formulaires
  filterForm!: FormGroup;

  // Souscriptions
  private userSubscription!: Subscription;
  private authSubscription!: Subscription;

  //#endregion

  //#region Constructor
  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService,
    private router: Router,
    private authService: AuthService,
    private fb: FormBuilder,
    private washService: WashsService,
    private serviceSettingsService: ServiceSettingsService,
    private centresService: CentresService
  ) {
    this.initializeForms();
  }

  private initializeForms(): void {
    this.filterForm = this.fb.group({
      dateRange: ['today'],
      status: ['all'],
      serviceType: ['all'],
      searchPlate: [''],
      startDate: [''],
      endDate: [''],
    });
  }
  //#endregion

  //#region Lifecycle Hooks
  ngOnInit(): void {
    this.loadCurrentUser();
    this.setupUserSubscriptions();

    // Initialiser les filtres avec la date d'aujourd'hui
    const today = new Date();
    this.startDate = this.formatDate(today);
    this.endDate = this.formatDate(today);
  }

  ngOnDestroy(): void {
    this.cleanupSubscriptions();
  }
  //#endregion

  //#region Subscription Management
  private setupUserSubscriptions(): void {
    // Souscription aux changements de l'utilisateur authentifié
    this.authSubscription = this.authService.currentUser$.subscribe((user) => {
      if (user && user.id !== this.currentUser?.id) {
        this.currentUser = user;
        this.loadWasherCentre();
      }
    });

    // Souscription au profil utilisateur
    this.userSubscription = this.authService
      .loadCurrentUserProfile()
      .subscribe({
        next: (user) => {
          if (user) {
            this.currentUser = user;
            this.loadWasherCentre();
          } else {
            this.loadUserFallback();
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement du profil', error);
          this.loadUserFallback();
        },
      });
  }

  private cleanupSubscriptions(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
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
      },
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
      },
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
          this.loadWasherData();
        } else {
          console.warn('Centre retourné invalide');
          this.findCentreForWasher();
        }
      },
      error: (error) => {
        console.error('Erreur chargement centre par ID:', error);
        this.findCentreForWasher();
      },
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
          // Dans un cas réel, vous devriez avoir une logique d'assignation
          this.currentCentre = centres[0];

          // Mettre à jour l'utilisateur avec le centre
          if (this.currentUser && this.currentCentre.id) {
            this.currentUser.centreId = this.currentCentre.id;
          }

          console.log(`🏢 Centre attribué: ${this.currentCentre.name}`);
          this.loadWasherData();
        } else {
          console.warn('Aucun centre disponible');
          this.showNoCentreMessage();
        }
      },
      error: (error) => {
        console.error('Erreur recherche centres:', error);
        this.showNoCentreMessage();
      },
    });
  }

  /**
   * Affiche un message si aucun centre n'est trouvé
   */
  private showNoCentreMessage(): void {
    console.warn('⚠️ Aucun centre assigné à ce laveur');
    // Vous pouvez afficher un message à l'utilisateur ici
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
              this.currentUser.photoSafeUrl =
                this.sanitizer.bypassSecurityTrustUrl(reader.result as string);
            }
          };
          reader.readAsDataURL(blob);
        },
        error: () => {
          this.setDefaultUserPhoto();
        },
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
      '4': 'Employé',
    };
    return roleMapping[roleId] || 'Laveur';
  }
  //#endregion

  //#region Washer Data Methods
  /**
   * Charge toutes les données du laveur (sessions, services, statistiques)
   */
  loadWasherData(): void {
    if (!this.currentUser?.id || !this.currentCentre?.id) {
      console.warn('Utilisateur ou centre non défini');
      return;
    }

    this.isLoading = true;

    // Charger en parallèle: services, sessions, centres
    forkJoin({
      services: this.serviceSettingsService
        .getServicesByCentre(this.currentCentre.id)
        .pipe(
          catchError((error) => {
            console.error('Erreur chargement services:', error);
            return of({
              success: false,
              data: [],
            } as unknown as ApiResponseData<ServiceSettings[]>);
          })
        ),
      sessions: this.washService.getAllWashSessions().pipe(
        catchError((error) => {
          console.error('Erreur chargement sessions:', error);
          return of({ success: false, data: [] } as unknown as ApiResponseData<
            WashSession[]
          >);
        })
      ),
      allCentres: this.centresService.getAllCentres().pipe(
        catchError((error) => {
          console.error('Erreur chargement centres:', error);
          return of([]);
        })
      ),
    })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (results) => {
          // Traiter les services
          if (results.services.success && results.services.data) {
            this.services = results.services.data;
          }

          // Traiter les sessions
          if (results.sessions.success && results.sessions.data) {
            this.handleSessionsLoaded(results.sessions.data);
          }

          // Traiter les centres
          this.centres = results.allCentres;

          // Calculer les statistiques
          this.calculateWasherStats();
        },
        error: (error) => {
          console.error('Erreur lors du chargement des données:', error);
        },
      });
  }

  /**
   * Gère les sessions chargées
   */
  private handleSessionsLoaded(sessions: WashSession[]): void {
    this.washerSessions = sessions;

    // Filtrer pour aujourd'hui
    this.filterTodaySessions();

    // Appliquer les filtres initiaux
    this.applyFilters();
  }

  /**
   * Filtre les sessions d'aujourd'hui
   */
  private filterTodaySessions(): void {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    this.todaySessions = this.washerSessions.filter((session) => {
      if (!session.createdAt) return false;
      const sessionDate = new Date(session.createdAt)
        .toISOString()
        .split('T')[0];
      return sessionDate === todayString;
    });
  }

  /**
   * Calcule les statistiques du laveur
   */
  private calculateWasherStats(): void {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    // Sessions aujourd'hui
    const sessionsToday = this.washerSessions.filter((session) => {
      if (!session.createdAt) return false;
      const sessionDate = new Date(session.createdAt)
        .toISOString()
        .split('T')[0];
      return sessionDate === todayString;
    });

    // Sessions de la semaine
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    const sessionsThisWeek = this.washerSessions.filter((session) => {
      if (!session.createdAt) return false;
      const sessionDate = new Date(session.createdAt);
      return sessionDate >= weekAgo && sessionDate <= today;
    });

    // Calculs
    this.washerStats.totalSessionsToday = sessionsToday.length;
    this.washerStats.totalSessionsWeek = sessionsThisWeek.length;

    // Revenus (si disponible dans les sessions)
    this.washerStats.totalRevenueToday = sessionsToday.reduce(
      (total, session) => {
        return total + (session.amountPaid || 0);
      },
      0
    );

    this.washerStats.totalRevenueWeek = sessionsThisWeek.reduce(
      (total, session) => {
        return total + (session.amountPaid || 0);
      },
      0
    );

    // Calcul des commissions (30% du revenu)
    this.washerStats.commissionToday =
      this.washerStats.totalRevenueToday *
      (this.washerStats.commissionRate / 100);
    this.washerStats.commissionWeek =
      this.washerStats.totalRevenueWeek *
      (this.washerStats.commissionRate / 100);

    // Taux de complétion (sessions terminées / total)
    // Note: Votre méthode getStatus() retourne des statuts en français
    const completedSessions = sessionsThisWeek.filter(
      (s) => s.getStatus() === 'Terminé' // Notez que c'est en français
    ).length;
    this.washerStats.completionRate =
      sessionsThisWeek.length > 0
        ? Math.round((completedSessions / sessionsThisWeek.length) * 100)
        : 0;
  }
  //#endregion

  //#region Filtering Methods
  /**
   * Applique tous les filtres
   */
  applyFilters(): void {
    let filtered = [...this.washerSessions];

    // Filtre par plage de dates
    filtered = this.filterByDateRange(filtered);

    // Filtre par statut
    filtered = this.filterByStatus(filtered);

    // Filtre par recherche (plaque)
    filtered = this.filterBySearch(filtered);

    // Trier par date (plus récent en premier)
    filtered.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    this.filteredSessions = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1; // Retour à la première page
  }

  /**
   * Filtre par plage de dates
   */
  private filterByDateRange(sessions: WashSession[]): WashSession[] {
    if (this.selectedDateFilter === 'all') {
      return sessions;
    }

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (this.selectedDateFilter) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'custom':
        if (this.startDate && this.endDate) {
          startDate = new Date(this.startDate);
          endDate = new Date(this.endDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          return sessions;
        }
        break;
      default:
        return sessions;
    }

    return sessions.filter((session) => {
      if (!session.createdAt) return false;
      const sessionDate = new Date(session.createdAt);
      return sessionDate >= startDate && sessionDate <= endDate;
    });
  }

  /**
   * Filtre par statut
   */
  private filterByStatus(sessions: WashSession[]): WashSession[] {
    if (this.selectedStatusFilter === 'all') {
      return sessions;
    }

    return sessions.filter(
      (session) => session.getStatus() === this.selectedStatusFilter
    );
  }

  /**
   * Filtre par recherche (plaque d'immatriculation)
   */
  private filterBySearch(sessions: WashSession[]): WashSession[] {
    if (!this.searchTerm.trim()) {
      return sessions;
    }

    const term = this.searchTerm.toLowerCase().trim();

    return sessions.filter((session) => {
      // Initialiser avec false par défaut
      const plateMatch =
        !!session.vehiclePlate &&
        session.vehiclePlate.toLowerCase().includes(term);

      const brandMatch =
        !!session.vehicleBrand &&
        session.vehicleBrand.toLowerCase().includes(term);

      let customerMatch = false;
      if (session.customer) {
        const nameMatch =
          !!session.customer.name &&
          session.customer.name.toLowerCase().includes(term);

        const phoneMatch =
          !!session.customer.phoneNumber &&
          session.customer.phoneNumber.includes(term);

        const emailMatch =
          !!session.customer.email &&
          session.customer.email.toLowerCase().includes(term);

        customerMatch = nameMatch || phoneMatch || emailMatch;
      }

      return plateMatch || brandMatch || customerMatch;
    });
  }

  /**
   * Change le filtre de date
   */
  onDateFilterChange(filter: string): void {
    this.selectedDateFilter = filter;

    if (filter === 'custom') {
      // Les dates custom seront gérées par l'utilisateur
      return;
    }

    this.applyFilters();
  }

  /**
   * Change le filtre de statut
   */
  onStatusFilterChange(status: string): void {
    this.selectedStatusFilter = status;
    this.applyFilters();
  }

  /**
   * Lance la recherche
   */
  onSearch(): void {
    this.applyFilters();
  }

  /**
   * Réinitialise tous les filtres
   */
  resetFilters(): void {
    this.searchTerm = '';
    this.selectedDateFilter = 'today';
    this.selectedStatusFilter = 'all';
    this.startDate = '';
    this.endDate = '';

    const today = new Date();
    this.startDate = this.formatDate(today);
    this.endDate = this.formatDate(today);

    this.applyFilters();
  }

  /**
   * Formate une date au format YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  //#endregion

  //#region Pagination Methods
  /**
   * Retourne les sessions paginées
   */
  get paginatedSessions(): WashSession[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredSessions.slice(
      startIndex,
      startIndex + this.itemsPerPage
    );
  }

  /**
   * Change de page
   */
  pageChanged(page: number): void {
    this.currentPage = page;
    this.scrollToTop();
  }

  /**
   * Calcule le nombre total de pages
   */
  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  /**
   * Génère les numéros de page avec élipsis
   */
  getPages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', this.totalPages);
      } else if (this.currentPage >= this.totalPages - 2) {
        pages.push(
          1,
          '...',
          this.totalPages - 3,
          this.totalPages - 2,
          this.totalPages - 1,
          this.totalPages
        );
      } else {
        pages.push(
          1,
          '...',
          this.currentPage - 1,
          this.currentPage,
          this.currentPage + 1,
          '...',
          this.totalPages
        );
      }
    }

    return pages;
  }

  /**
   * Navigue vers une page
   */
  goToPage(page: number | string): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.scrollToTop();
    }
  }

  /**
   * Remonte en haut de la page
   */
  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  //#endregion

  //#region UI Helper Methods
  /**
   * Retourne le badge CSS pour un statut donné
   */
  getStatusBadge(status: string): string {
    switch (status) {
      case 'Completed':
        return 'bg-success-light text-success';
      case 'Cancelled':
        return 'bg-danger-light text-danger';
      case 'InProgress':
        return 'bg-warning-light text-warning';
      case 'Pending':
        return 'bg-info-light text-info';
      default:
        return 'bg-secondary-light text-secondary';
    }
  }

  /**
   * Retourne le libellé français d'un statut
   */
  getStatusLabel(status: string): string {
    switch (status) {
      case 'Completed':
        return 'Terminé';
      case 'Cancelled':
        return 'Annulé';
      case 'InProgress':
        return 'En cours';
      case 'Pending':
        return 'En attente';
      default:
        return status;
    }
  }

  /**
   * Retourne le nom d'un service par son ID
   */
  getServiceName(serviceId: string): string {
    if (!this.services || this.services.length === 0) {
      return 'Chargement...';
    }

    const service = this.services.find((s) => s.id === serviceId);
    return service ? service.name : 'Service inconnu';
  }

  /**
   * Retourne le nom d'un centre par son ID
   */
  getCentreName(centreId: string): string {
    if (!this.centres || this.centres.length === 0) {
      return 'Chargement...';
    }

    const centre = this.centres.find((c) => c.id === centreId);
    return centre ? centre.name : 'Centre inconnu';
  }

  /**
   * Formate un montant en devise XOF (FCFA)
   */
  formatCurrency(
    amount: number | undefined | null,
    options: {
      showCurrency?: boolean;
      currencySymbol?: string;
      locale?: string;
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
    } = {}
  ): string {
    // Options par défaut
    const {
      showCurrency = true,
      currencySymbol = 'FCFA',
      locale = 'fr-FR',
      minimumFractionDigits = 0,
      maximumFractionDigits = 0,
    } = options;

    // Gérer les valeurs null/undefined
    if (amount === undefined || amount === null || isNaN(amount)) {
      return showCurrency ? `0 ${currencySymbol}` : '0';
    }

    // Formater avec séparateur de milliers
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
    });

    const formattedAmount = formatter.format(amount);

    return showCurrency
      ? `${formattedAmount} ${currencySymbol}`
      : formattedAmount;
  }

  /**
   * Formate un montant en XOF avec séparateur de milliers
   * Exemple: 1500000 → "1 500 000 FCFA"
   */
  formatXOF(amount: number | undefined | null): string {
    return this.formatCurrency(amount, {
      showCurrency: true,
      currencySymbol: 'FCFA',
      locale: 'fr-FR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  /**
   * Formate un montant avec décimales (pour les montants précis)
   * Exemple: 1500.50 → "1 500,50 FCFA"
   */
  formatXOFWithDecimals(amount: number | undefined | null): string {
    return this.formatCurrency(amount, {
      showCurrency: true,
      currencySymbol: 'FCFA',
      locale: 'fr-FR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Formate un montant en XOF sans le symbole devise
   * Exemple: 1500000 → "1 500 000"
   */
  formatAmountOnly(amount: number | undefined | null): string {
    return this.formatCurrency(amount, {
      showCurrency: false,
      locale: 'fr-FR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  /**
   * Formate un montant en XOF compact (format court)
   * Exemple: 1500000 → "1,5M FCFA"
   */
  formatXOFCompact(amount: number | undefined | null): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '0 FCFA';
    }

    const formatter = new Intl.NumberFormat('fr-FR', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    });

    return `${formatter.format(amount)} FCFA`;
  }

  /**
   * Formate un montant en XOF avec couleur selon la valeur
   * Utile pour les templates avec classes CSS
   */
  formatXOFWithColor(amount: number | undefined | null): {
    amount: string;
    cssClass: string;
  } {
    const formatted = this.formatXOF(amount);
    const numAmount = amount || 0;

    let cssClass = 'text-muted';
    if (numAmount > 10000) cssClass = 'text-success';
    if (numAmount > 50000) cssClass = 'text-success fw-bold';
    if (numAmount < 0) cssClass = 'text-danger';

    return {
      amount: formatted,
      cssClass,
    };
  }

  /**
   * Formate une date
   */
  formatDateDisplay(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Calcule la durée d'une session
   */
  getSessionDuration(session: WashSession): string {
    if (!session.actualStart || !session.actualEnd) {
      return 'N/A';
    }

    const start = new Date(session.actualStart).getTime();
    const end = new Date(session.actualEnd).getTime();
    const durationMs = end - start;

    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);

    return `${minutes}min ${seconds}s`;
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
   * Retourne le nom du centre actuel du laveur
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

  /**
   * Rafraîchit les données
   */
  refreshData(): void {
    if (this.currentUser?.id && this.currentCentre?.id) {
      this.loadWasherData();
    }
  }
  //#endregion
}

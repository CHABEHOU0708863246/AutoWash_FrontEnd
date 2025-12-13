import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  Subject,
  catchError,
  finalize,
  of,
  takeUntil,
  switchMap,
  tap,
  filter,
  Observable,
} from 'rxjs';
import { Users } from '../../../core/models/Users/Users';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { ServiceSettingsService } from '../../../core/services/ServiceSettings/service-settings.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Centres } from '../../../core/models/Centres/Centres';
import { WashSession } from '../../../core/models/Wash/WashSession';
import { ApiResponseData } from '../../../core/models/ApiResponseData';
import { ServiceSettings } from '../../../core/models/Settings/Services/ServiceSettings';
import { WashsService } from '../../../core/services/Washs/washs.service';
import { CustomerInfo } from '../../../core/models/Customer/CustomerInfo';

/**
 * Composant de gestion des sessions de lavage pour les managers
 * Affiche uniquement les sessions du centre assigné au manager connecté
 */
@Component({
  selector: 'app-wash-today',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './wash-today.component.html',
  styleUrl: './wash-today.component.scss',
})
export class WashTodayComponent implements OnInit, OnDestroy {
  //#region Properties

  // Observable pour la gestion des souscriptions
  private destroy$ = new Subject<void>();

  // Utilisateur connecté
  currentUser: Users | null = null;

  // Centre du manager
  managerCentre: Centres | null = null;
  centres : Centres[] = [];

  // Interface utilisateur
  isSidebarCollapsed = false;
  Math = Math;

  // Sessions de lavage
  washSessions: WashSession[] = [];
  filteredSessions: WashSession[] = [];

  // États de chargement et d'erreur
  isLoading = false;
  hasError = false;
  errorMessage = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;

  // Recherche et filtres
  searchTerm = '';
  statusFilter = 'all'; // all, Completed, Cancelled, InProgress, Pending

  // Services du centre
  services: ServiceSettings[] = [];
  servicesMap = new Map<string, ServiceSettings>(); // Map pour accès rapide

  // Statistiques
  stats = {
    total: 0,
    completed: 0,
    cancelled: 0,
    inProgress: 0,
    pending: 0,
    todayRevenue: 0
  };

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
  ) {}

  //#endregion

  //#region Lifecycle Hooks

  /**
   * Initialisation du composant
   */
  ngOnInit(): void {
    this.initializeComponent();
  }

  /**
   * Nettoyage lors de la destruction du composant
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  //#endregion

  //#region Initialization Methods

  /**
   * Initialise le composant en chargeant toutes les données nécessaires
   */
  private initializeComponent(): void {
    this.loadCurrentUserAndData();
  }

  /**
   * Charge l'utilisateur connecté et cascade le chargement des données
   * Flux : Utilisateur → Centre → Services → Sessions
   */
   loadCurrentUserAndData(): void {
  this.isLoading = true;
  this.clearError();

  this.authService.loadCurrentUserProfile()
    .pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        console.warn('⚠️ Chargement via AuthService échoué, tentative avec UsersService', error);
        return this.usersService.getCurrentUser();
      }),
      filter((user): user is Users => {
        if (!user) {
          this.handleError('Impossible de charger les informations utilisateur.');
          return false;
        }
        return true;
      }),
      tap(user => {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
        console.log('✅ Utilisateur connecté:', this.getFullName());
      }),
      switchMap(user => this.loadManagerCentre(user)),
      switchMap(() => this.loadCentreServices()),
      switchMap(() => this.loadWashSessions()),
      finalize(() => {
        this.isLoading = false;
      })
    )
    .subscribe({
      next: () => {
        console.log('✅ Composant initialisé avec succès');
        this.calculateStatistics();
      },
      error: (error) => {
        console.error('❌ Erreur lors de l\'initialisation du composant', error);
        this.handleError('Une erreur est survenue lors du chargement des données.');
      }
    });
}

  /**
   * Charge le centre associé au manager connecté
   */
  loadManagerCentre(user: Users): Observable<void> {
  return new Observable(subscriber => {
    // Vérifier si l'utilisateur a un centre assigné
    if (!user.centreId) {
      this.handleError('Aucun centre n\'est assigné à votre compte. Veuillez contacter l\'administrateur.');
      subscriber.complete();
      return;
    }

    const subscription = this.centresService.getCentreById(user.centreId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (centre: Centres) => {
          this.managerCentre = centre;
          console.log('✅ Centre du manager chargé:', this.managerCentre.name);
          subscriber.next();
          subscriber.complete();
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement du centre', error);
          this.handleError('Impossible de charger les informations du centre.');
          subscriber.complete();
        }
      });

    return () => subscription.unsubscribe();
  });
}

  //#endregion

  //#region Wash Sessions Methods

  /**
   * Charge les sessions de lavage du centre du manager uniquement
   */
  private loadWashSessions(): Observable<any> {
    if (!this.managerCentre?.id) {
      console.warn('⚠️ Aucun centre disponible, impossible de charger les sessions');
      return of({ success: false, data: [] });
    }

    this.isLoading = true;

    return this.washService.getCompletedWashes(this.managerCentre.id).pipe(
      takeUntil(this.destroy$),
      tap((response: ApiResponseData<WashSession[]>) => {
        if (response.success && response.data) {
          this.washSessions = response.data;
          this.applyFiltersAndSort();
          console.log(`✅ ${this.washSessions.length} sessions chargées pour le centre "${this.managerCentre?.name}"`);
        } else {
          console.warn('⚠️ Aucune session de lavage trouvée');
          this.washSessions = [];
          this.filteredSessions = [];
          this.totalItems = 0;
        }
      }),
      catchError(error => {
        console.error('❌ Erreur lors du chargement des sessions', error);
        this.handleError('Impossible de charger les sessions de lavage.');
        this.washSessions = [];
        this.filteredSessions = [];
        return of({ success: false, data: [] } as unknown as ApiResponseData<WashSession[]>);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    );
  }

  /**
   * Applique les filtres de recherche et de statut, puis trie les résultats
   */
applyFiltersAndSort(): void {
  let sessions = [...this.washSessions];

  // Filtrage par terme de recherche
  if (this.searchTerm.trim()) {
    const term = this.searchTerm.toLowerCase().trim();
    sessions = sessions.filter(session => {
      // Extraction sécurisée du nom du client
      const customerName = this.extractCustomerName(session.customer);

      return (
        (session.vehiclePlate?.toLowerCase().includes(term)) ||
        (customerName.toLowerCase().includes(term)) ||
        (this.getServiceName(session.serviceId).toLowerCase().includes(term))
      );
    });
  }

  // Filtrage par statut
  if (this.statusFilter && this.statusFilter !== 'all') {
    sessions = sessions.filter(session => session.getStatus() === this.statusFilter);
  }

  // Tri par date décroissante (plus récent en premier)
  sessions.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  this.filteredSessions = sessions;
  this.totalItems = this.filteredSessions.length;

  // Réinitialiser à la page 1 si la page actuelle n'existe plus
  if (this.currentPage > this.totalPages && this.totalPages > 0) {
    this.currentPage = 1;
  } else if (this.totalPages === 0) {
    this.currentPage = 1;
  }
}

/**
 * Extrait le nom du client de manière sécurisée, qu'il soit string ou CustomerInfo
 */
private extractCustomerName(customer: string | CustomerInfo | any): string {
  if (!customer) {
    return '';
  }

  // Si c'est une chaîne de caractères
  if (typeof customer === 'string') {
    return customer;
  }

  // Si c'est un objet CustomerInfo
  if (customer instanceof CustomerInfo) {
    return customer.name || customer.phoneNumber || '';
  }

  // Si c'est un objet avec des propriétés name
  if (typeof customer === 'object') {
    // Essayer différentes propriétés possibles pour le nom
    if (customer.name && typeof customer.name === 'string') {
      return customer.name;
    }
    if (customer.fullName && typeof customer.fullName === 'string') {
      return customer.fullName;
    }
    if ((customer.firstName || customer.lastName) &&
        (typeof customer.firstName === 'string' || typeof customer.lastName === 'string')) {
      return `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    }
    if (customer.phoneNumber && typeof customer.phoneNumber === 'string') {
      return customer.phoneNumber;
    }
  }

  // Fallback: convertir en string
  return String(customer);
}

  /**
   * Déclenche la recherche
   */
  onSearch(): void {
    this.applyFiltersAndSort();
    this.currentPage = 1;
  }

  /**
   * Réinitialise tous les filtres
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.applyFiltersAndSort();
    this.currentPage = 1;
  }

  /**
   * Filtre par statut
   */
  filterByStatus(status: string): void {
    this.statusFilter = status;
    this.applyFiltersAndSort();
    this.currentPage = 1;
  }

  /**
   * Rafraîchit les sessions de lavage
   */
  refreshSessions(): void {
    console.log('🔄 Rafraîchissement des sessions...');
    this.clearError();
    this.loadWashSessions().subscribe({
      next: () => {
        this.calculateStatistics();
        console.log('✅ Sessions rafraîchies avec succès');
      },
      error: (error) => {
        console.error('❌ Erreur lors du rafraîchissement', error);
      }
    });
  }

  /**
   * Calcule les statistiques des sessions
   */
  private calculateStatistics(): void {
    this.stats = {
      total: this.washSessions.length,
      completed: this.washSessions.filter(s => s.getStatus() === 'Completed').length,
      cancelled: this.washSessions.filter(s => s.getStatus() === 'Cancelled').length,
      inProgress: this.washSessions.filter(s => s.getStatus() === 'InProgress').length,
      pending: this.washSessions.filter(s => s.getStatus() === 'Pending').length,
      todayRevenue: this.calculateTodayRevenue()
    };
  }

  /**
   * Calcule le revenu du jour
   */
  private calculateTodayRevenue(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.washSessions
      .filter(session => {
        const sessionDate = new Date(session.createdAt);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === today.getTime() && session.getStatus() === 'Completed';
      })
      .reduce((sum, session) => sum + (session.amountPaid || 0), 0);
  }

  /**
   * Formate le statut pour l'affichage avec badge CSS
   */
  getStatusBadge(status: string): string {
    const statusMap: { [key: string]: string } = {
      'Completed': 'bg-success text-white',
      'Cancelled': 'bg-danger text-white',
      'InProgress': 'bg-warning text-dark',
      'Pending': 'bg-info text-white'
    };
    return statusMap[status] || 'bg-secondary text-white';
  }

  /**
   * Formate le statut en français
   */
  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'Completed': 'Terminé',
      'Cancelled': 'Annulé',
      'InProgress': 'En cours',
      'Pending': 'En attente'
    };
    return statusLabels[status] || status;
  }

  /**
   * Formate une date en format lisible
   */
  formatDate(date: string | Date): string {
    if (!date) return 'Date non disponible';

    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };

    return d.toLocaleDateString('fr-FR', options);
  }

  /**
   * Formate un montant en devise
   */
  formatAmount(amount: number): string {
    if (!amount) return '0 FCFA';
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  }

  //#endregion

  //#region Service Methods

  /**
   * Charge les services du centre du manager
   */
  private loadCentreServices(): Observable<any> {
    if (!this.managerCentre?.id) {
      console.warn('⚠️ Aucun centre disponible, impossible de charger les services');
      return of({ success: false, data: [] });
    }

    return this.serviceSettingsService.getServicesByCentre(this.managerCentre.id).pipe(
      takeUntil(this.destroy$),
      tap((response: ApiResponseData<ServiceSettings[]>) => {
        if (response.success && response.data) {
          this.services = response.data;
          this.buildServicesMap();
          console.log(`✅ ${this.services.length} services chargés pour le centre`);
        } else {
          console.warn('⚠️ Aucun service trouvé pour ce centre');
          this.services = [];
        }
      }),
      catchError(error => {
        console.error('❌ Erreur lors du chargement des services', error);
        this.services = [];
        return of({ success: false, data: [] } as unknown as ApiResponseData<ServiceSettings[]>);
      })
    );
  }

  /**
   * Construit une Map pour un accès rapide aux services
   */
  private buildServicesMap(): void {
    this.servicesMap.clear();
    this.services.forEach(service => {
      if (service.id) {
        this.servicesMap.set(service.id, service);
      }
    });
  }

  /**
   * Retourne le nom d'un service par son ID (optimisé avec Map)
   */
  getServiceName(serviceId: string): string {
    if (!serviceId) return 'Non spécifié';
    const service = this.servicesMap.get(serviceId);
    return service?.name || 'Service inconnu';
  }

  /**
   * Retourne le prix d'un service par son ID
   */
  getServicePrice(serviceId: string): number {
    if (!serviceId) return 0;
    const service = this.servicesMap.get(serviceId);
    return service?.basePrice || 0;
  }

  /**
 * Retourne le nom d'un centre par son ID
 */
getCentreName(centreId: string): string {
  if (!centreId) {
    return 'Centre non spécifié';
  }

  const centre = this.centres.find((c) => c.id === centreId);
  return centre ? centre.name : 'Centre non trouvé';
}

  /**
   * Retourne l'adresse du centre du manager
   */
  getCentreAddress(): string {
    return this.managerCentre?.location || 'Adresse non disponible';
  }

  //#endregion

  //#region Pagination Methods

  /**
   * Retourne les sessions paginées pour la page actuelle
   */
  get paginatedSessions(): WashSession[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredSessions.slice(startIndex, endIndex);
  }

  /**
   * Change de page
   */
  pageChanged(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.scrollToTop();
    }
  }

  /**
   * Navigue vers la page suivante
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.pageChanged(this.currentPage + 1);
    }
  }

  /**
   * Navigue vers la page précédente
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.pageChanged(this.currentPage - 1);
    }
  }

  /**
   * Calcule le nombre total de pages
   */
  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  /**
   * Génère les numéros de page avec ellipsis
   */
  getPages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (this.totalPages === 0) {
      return [1];
    }

    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(this.totalPages);
      } else if (this.currentPage >= this.totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = this.totalPages - 3; i <= this.totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(this.currentPage - 1);
        pages.push(this.currentPage);
        pages.push(this.currentPage + 1);
        pages.push('...');
        pages.push(this.totalPages);
      }
    }

    return pages;
  }

  /**
   * Change de page avec validation
   */
  goToPage(page: number | string): void {
    if (typeof page === 'number') {
      this.pageChanged(page);
    }
  }

  /**
   * Change le nombre d'éléments par page
   */
  changeItemsPerPage(items: number): void {
    this.itemsPerPage = items;
    this.currentPage = 1;
    this.applyFiltersAndSort();
  }

  /**
   * Remonte en haut de la liste
   */
  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Retourne les informations de pagination
   */
  getPaginationInfo(): string {
    if (this.totalItems === 0) {
      return 'Aucune session';
    }
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
    return `${start} - ${end} sur ${this.totalItems}`;
  }

  //#endregion

  //#region User Management Methods

  /**
   * Charge la photo de l'utilisateur connecté de manière optimisée
   */
  private loadCurrentUserPhoto(): void {
    if (!this.currentUser?.photoUrl || typeof this.currentUser.photoUrl !== 'string') {
      this.setDefaultAvatar();
      return;
    }

    this.usersService.getUserPhoto(this.currentUser.photoUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => this.convertBlobToSafeUrl(blob),
        error: (error) => {
          console.warn('⚠️ Erreur lors du chargement de la photo utilisateur', error);
          this.setDefaultAvatar();
        }
      });
  }

  /**
   * Convertit un Blob en SafeUrl
   */
  private convertBlobToSafeUrl(blob: Blob): void {
    const reader = new FileReader();
    reader.onload = () => {
      if (this.currentUser) {
        this.currentUser.photoSafeUrl = this.sanitizer.bypassSecurityTrustUrl(
          reader.result as string
        );
      }
    };
    reader.onerror = () => {
      console.error('❌ Erreur lors de la lecture de la photo');
      this.setDefaultAvatar();
    };
    reader.readAsDataURL(blob);
  }

  /**
   * Définit l'avatar par défaut
   */
  private setDefaultAvatar(): void {
    if (this.currentUser) {
      this.currentUser.photoSafeUrl = this.sanitizer.bypassSecurityTrustUrl(
        'assets/images/default-avatar.png'
      );
    }
  }

  /**
   * Retourne le nom complet de l'utilisateur connecté
   */
  getFullName(): string {
    if (!this.currentUser) return 'Utilisateur';
    const firstName = this.currentUser.firstName?.trim() || '';
    const lastName = this.currentUser.lastName?.trim() || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || 'Utilisateur';
  }

  /**
   * Retourne les initiales de l'utilisateur
   */
  getUserInitials(): string {
    if (!this.currentUser) return 'U';
    const firstName = this.currentUser.firstName?.charAt(0).toUpperCase() || '';
    const lastName = this.currentUser.lastName?.charAt(0).toUpperCase() || '';
    return `${firstName}${lastName}` || 'U';
  }

  /**
   * Retourne le rôle de l'utilisateur connecté
   */
  getUserRole(): string {
    if (!this.currentUser?.roles?.length) {
      const role = this.authService.getUserRole();
      return role ? this.mapRoleIdToName(role) : 'Rôle non défini';
    }
    return this.mapRoleIdToName(this.currentUser.roles[0]);
  }

  /**
   * Convertit l'ID du rôle en nom lisible
   */
  private mapRoleIdToName(roleId: string): string {
    const roleMapping: { [key: string]: string } = {
      '1': 'Administrateur',
      '2': 'Manager',
      '3': 'Éditeur',
      '4': 'Utilisateur',
    };
    return roleMapping[roleId] || 'Rôle inconnu';
  }

  //#endregion

  //#region UI Interaction Methods

  /**
   * Bascule l'état de la sidebar
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
   * Déconnecte l'utilisateur et redirige vers la page de connexion
   */
  logout(): void {
    if (this.authService.isAuthenticated()) {
      try {
        console.log('🚪 Déconnexion en cours...');
        this.authService.logout();
        this.router.navigate(['/auth/login']);
        console.log('✅ Déconnexion réussie');
      } catch (error) {
        console.error('❌ Erreur lors de la déconnexion:', error);
        // Force la redirection même en cas d'erreur
        this.router.navigate(['/auth/login']);
      }
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Navigation vers la page de détails d'une session
   */
  viewSessionDetails(sessionId: string): void {
    if (sessionId) {
      this.router.navigate(['/dashboard/wash-sessions', sessionId]);
    }
  }

  /**
   * Exporte les données en CSV
   */
  exportToCSV(): void {
    if (this.filteredSessions.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const csvData = this.convertToCSV(this.filteredSessions);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `sessions_lavage_${this.getCentreName(this.managerCentre?.id || '')}_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Convertit les sessions en format CSV
   */
  private convertToCSV(sessions: WashSession[]): string {
    const headers = ['Date', 'Plaque', 'Client', 'Téléphone', 'Service', 'Statut', 'Montant'];
    const rows = sessions.map(session => [
      this.formatDate(session.createdAt),
      session.vehiclePlate || '',
      session.customer || '',
      session.customer || '',
      this.getServiceName(session.serviceId),
      this.getStatusLabel(session.getStatus()),
      session.amountPaid?.toString() || '0'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  //#endregion

  //#region Error Handling

  /**
   * Gère les erreurs avec affichage à l'utilisateur
   */
  private handleError(message: string): void {
    this.hasError = true;
    this.errorMessage = message;
    this.isLoading = false;
    console.error('❌ Erreur:', message);
  }

  /**
   * Réinitialise l'état d'erreur
   */
  clearError(): void {
    this.hasError = false;
    this.errorMessage = '';
  }

  /**
   * Retourne si le composant est en état vide (pas de données)
   */
  get isEmpty(): boolean {
    return !this.isLoading && this.filteredSessions.length === 0 && !this.hasError;
  }

  //#endregion
}

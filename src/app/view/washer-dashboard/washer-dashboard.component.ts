import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  BehaviorSubject,
  Subscription,
  forkJoin,
  debounceTime,
  distinctUntilChanged,
  interval,
} from 'rxjs';

// Chart.js
import {
  Chart,
  ChartConfiguration,
  ChartData,
  ChartType,
  registerables,
} from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

// Models
import { Users } from '../../core/models/Users/Users';
import { DashboardAlert } from '../../core/models/Dashboards/DashboardAlert';
import { DashboardKpiDto } from '../../core/models/Dashboards/DashboardKpiDto';
import { DashboardSnapshot } from '../../core/models/Dashboards/DashboardSnapshot';
import { WeeklyComparisonDto } from '../../core/models/Dashboards/WeeklyComparisonDto';
import { Centres } from '../../core/models/Centres/Centres';
import { ServiceSettings } from '../../core/models/Settings/Services/ServiceSettings';

// Services
import { AuthService } from '../../core/services/Auth/auth.service';
import { UsersService } from '../../core/services/Users/users.service';
import { CentresService } from '../../core/services/Centres/centres.service';
import { DashboardsService } from '../../core/services/Dashboards/dashboards.service';
import { ServiceSettingsService } from '../../core/services/ServiceSettings/service-settings.service';

// Enregistrer tous les composants Chart.js
Chart.register(...registerables);

//#region Interfaces pour les données du laveur
interface WasherStats {
  todayWashCount: number;
  dailyGoal: number;
  completedGoalPercentage: number;
  todayRevenue: number;
  averageTimePerWash: number;
  totalWashesThisWeek: number;
  totalRevenueThisWeek: number;
}

interface WasherPerformance {
  rating: number;
  qualityScore: number;
  speedScore: number;
  customerSatisfaction: number;
}

interface VehicleInQueue {
  id: string;
  vehicleModel: string;
  licensePlate: string;
  serviceType: string;
  customerName?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  waitTime: number;
  bayNumber?: string;
  estimatedDuration: number;
}
//#endregion

@Component({
  selector: 'app-washer-dashboard',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './washer-dashboard.component.html',
  styleUrls: ['./washer-dashboard.component.scss'],
})
export class WasherDashboardComponent implements OnInit, OnDestroy {
  //#region Properties

  // Propriétés utilisateur
  users: Users[] = [];
  currentUser: Users | null = null;
  displayedUsers: Users[] = [];
  isSidebarCollapsed = false;

  // Données du dashboard
  dashboardData: DashboardSnapshot | null = null;
  kpiData: DashboardKpiDto | null = null;
  weeklyComparison: WeeklyComparisonDto | null = null;
  activeAlerts: DashboardAlert[] = [];
  last7DaysWashCount: number[] = [];
  currentCentre: Centres | null = null;
  services: ServiceSettings[] = [];

  // Statistiques du laveur
  washerStats: WasherStats = {
    todayWashCount: 0,
    dailyGoal: 15,
    completedGoalPercentage: 0,
    todayRevenue: 0,
    averageTimePerWash: 0,
    totalWashesThisWeek: 0,
    totalRevenueThisWeek: 0,
  };

  washerPerformance: WasherPerformance = {
    rating: 4.5,
    qualityScore: 92,
    speedScore: 88,
    customerSatisfaction: 95,
  };

  // File d'attente et véhicule en cours
  vehicleQueue: VehicleInQueue[] = [];
  currentVehicle: VehicleInQueue | null = null;

  // États de chargement
  loadingDashboard = false;
  loadingPerformance = false;
  loadingQueue = false;
  loadingEquipment = false;
  loadingCentre = false;
  loadingServices = false;

  // Filtres
  selectedPeriod = 'today';
  selectedService = 'all';
  startDate: string = '';
  endDate: string = '';

  // Configuration des graphiques
  public progressChartData: ChartData<'doughnut'> = {
    labels: ['Terminés', 'En cours', 'Restants'],
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: ['#10B981', '#3B82F6', '#E5E7EB'],
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 4,
      },
    ],
  };

  public efficiencyChartData: ChartData<'bar'> = {
    labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Auj'],
    datasets: [
      {
        label: 'Temps moyen (min)',
        data: [22, 24, 20, 25, 23, 26, 0],
        backgroundColor: '#8B5CF6',
        borderRadius: 6,
        borderWidth: 0,
      },
    ],
  };

  public progressChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce(
              (a: any, b: any) => a + b,
              0
            );
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  public efficiencyChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Minutes',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  public progressChartType: 'doughnut' = 'doughnut';
  public efficiencyChartType: 'bar' = 'bar';

  // Timers
  currentWashTimer?: any;
  currentWashDuration = 0;
  sessionTimer?: any;
  sessionDuration = 0;
  sessionStartTime: Date | null = null;

  // Sujets pour le debounce
  private filterChangeSubject = new BehaviorSubject<void>(undefined);

  // Souscriptions
  private currentUserSubscription!: Subscription;
  private filterSubscription!: Subscription;
  private dataRefreshSubscription?: Subscription;
  private sessionTimerSubscription?: Subscription;
  private washTimerSubscription?: Subscription;

  // Mode d'affichage
  public kioskMode = false;
  public raceMode = false;
  Math = Math;

  //#endregion

  //#region Constructor
  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService,
    private router: Router,
    private authService: AuthService,
    private centresService: CentresService,
    private dashboardService: DashboardsService,
    private serviceSettingsService: ServiceSettingsService
  ) {}
  //#endregion

  //#region Lifecycle Hooks
  ngOnInit(): void {
    this.getUsers();
    this.loadCurrentUser();
    this.setupUserSubscription();
    this.setupFilterListener();
    this.startSessionTimer();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.cleanupSubscriptions();
    this.clearTimers();
  }
  //#endregion

  //#region Initialization Methods
  /**
   * Récupère tous les utilisateurs et charge leurs photos.
   */
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

  /**
   * Charge l'utilisateur actuellement connecté avec son centre
   */
  loadCurrentUser(): void {
    this.authService.loadCurrentUserProfile().subscribe({
      next: (user) => {
        if (user) {
          this.handleUserLoaded(user);
        } else {
          this.loadCurrentUserFallback();
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement du profil utilisateur', error);
        this.loadCurrentUserFallback();
      },
    });
  }

  /**
   * Configure l'abonnement aux changements de l'utilisateur
   */
  setupUserSubscription(): void {
  this.currentUserSubscription = this.authService.currentUser$.subscribe(
    (user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
        // Charger automatiquement le centre du laveur
        this.loadWasherCentre();
      }
    }
  );
  }

  /**
   * Configuration de l'écoute des changements de filtre avec debounce
   */
  setupFilterListener(): void {
    this.filterSubscription = this.filterChangeSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.loadWasherData();
      });
  }

  /**
   * Déclencher le rechargement des données avec debounce
   */
  triggerFilterChange(): void {
    this.filterChangeSubject.next();
  }

  /**
   * Configuration du rafraîchissement automatique toutes les 30 secondes
   */
  setupAutoRefresh(): void {
    this.dataRefreshSubscription = interval(30000).subscribe(() => {
      if (this.currentCentre?.id) {
        this.refreshDashboardData();
      }
    });
  }

  /**
   * Nettoye les abonnements
   */
  cleanupSubscriptions(): void {
    if (this.currentUserSubscription) {
      this.currentUserSubscription.unsubscribe();
    }
    if (this.filterSubscription) {
      this.filterSubscription.unsubscribe();
    }
    if (this.dataRefreshSubscription) {
      this.dataRefreshSubscription.unsubscribe();
    }
    if (this.sessionTimerSubscription) {
      this.sessionTimerSubscription.unsubscribe();
    }
    if (this.washTimerSubscription) {
      this.washTimerSubscription.unsubscribe();
    }
  }

  /**
   * Efface les timers actifs
   */
  clearTimers(): void {
    if (this.currentWashTimer) {
      clearInterval(this.currentWashTimer);
    }
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
    }
  }
  //#endregion

  //#region User Management Methods
  /**
   * Gère l'utilisateur chargé
   */
  handleUserLoaded(user: Users): void {
    this.currentUser = user;
    this.loadCurrentUserPhoto();

    // Charger immédiatement le centre du laveur
    this.loadWasherCentre();
  }

  /**
   * Vérifie si un centre est assigné au laveur
   */
  hasCentreAssigned(): boolean {
    return !!this.currentCentre?.id;
  }

  /**
   * Obtenir le statut du centre
   */
  getCentreStatus(): string {
    if (this.loadingCentre) return 'Chargement du centre...';
    if (this.hasCentreAssigned())
      return `Centre: ${this.getCurrentCentreName()}`;
    return 'Aucun centre assigné';
  }

  /**
   * Méthode pour forcer la recherche de centre
   */
  searchForCentre(): void {
    console.log('🔍 Recherche manuelle de centre...');
    this.loadWasherCentre();
  }

  /**
   * Méthode de secours pour charger l'utilisateur
   */
  loadCurrentUserFallback(): void {
    this.usersService.getCurrentUser().subscribe({
      next: (user) => {
        this.handleUserLoaded(user);
      },
      error: (error) => {
        console.error(
          "Erreur lors du chargement de l'utilisateur connecté",
          error
        );
      },
    });
  }

  /**
 * Charger le centre du laveur
 */
loadWasherCentre(): void {
  if (!this.currentUser?.id) {
    console.warn('⚠️ Utilisateur non connecté');
    this.loadingCentre = false;
    return;
  }

  this.loadingCentre = true;

  // Si l'utilisateur a un centreId, charger ce centre
  if (this.currentUser.centreId) {
    console.log('✅ CentreId trouvé dans user:', this.currentUser.centreId);

    this.centresService.getCentreById(this.currentUser.centreId).subscribe({
      next: (centre) => {
        console.log('🔍 Centre retourné par API:', centre);

        // Vérifier que le centre a bien un nom
        if (!centre || !centre.name) {
          console.error('❌ Centre retourné invalide ou sans nom:', centre);
          this.tryFindCentreByWasherAssignment();
          return;
        }

        this.currentCentre = centre;
        this.loadingCentre = false;
        console.log('✅ Centre chargé:', centre.name, '(ID:', centre.id, ')');

        // S'assurer que centre.id existe avant de l'utiliser
        if (centre.id) {
          // Charger les services et données du laveur
          this.loadServicesForCentre(centre.id);
          this.loadWasherData();
        } else {
          console.error('❌ Centre sans ID:', centre);
          this.tryFindCentreByWasherAssignment();
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement du centre:', error);
        this.loadingCentre = false;
        this.tryFindCentreByWasherAssignment();
      },
    });
  } else {
    // Si pas de centreId, essayer de trouver par assignation du laveur
    console.log('⚠️ Pas de centreId dans l\'utilisateur, recherche...');
    this.tryFindCentreByWasherAssignment();
  }
}

  /**
   * Essayer de trouver un centre par l'assignation du laveur
   */
  tryFindCentreByWasherAssignment(): void {
    console.log('🔍 Recherche de centre par assignation du laveur...');

    this.centresService.getAllCentres().subscribe({
      next: (centres) => {
        console.log('📋 Centres disponibles:', centres.length);

        // Chercher un centre où le laveur est assigné
        let washerCentre: Centres | null = null;
        if (centres.length > 0) {
          washerCentre = centres[0];
          console.log(
            '🏢 Attribution du premier centre disponible:',
            washerCentre.name
          );

          // Mettre à jour l'utilisateur avec le centreId
          this.updateWasherWithCentre(washerCentre.id!);
        }

        if (washerCentre) {
          this.currentCentre = washerCentre;
          this.loadingCentre = false;

          // Charger les données après avoir trouvé un centre
          this.loadServicesForCentre(washerCentre.id!);
          this.loadWasherData();
        } else {
          this.showNoCentreMessage();
          this.loadingCentre = false;
        }
      },
      error: (error) => {
        console.error('Erreur lors de la recherche des centres:', error);
        this.loadingCentre = false;
        this.showNoCentreMessage();
      },
    });
  }

  /**
   * Mettre à jour l'utilisateur avec le centreId
   */
  updateWasherWithCentre(centreId: string): void {
    console.log('📝 Mise à jour du laveur avec centreId:', centreId);
    if (this.currentUser) {
      this.currentUser.centreId = centreId;
    }
  }

  /**
   * Chercher un centre pour le laveur
   */
  findCentreForWasher(): void {
    console.log('🔍 Recherche de centre pour le laveur...');

    this.centresService.getAllCentres().subscribe({
      next: (centres) => {
        console.log('📋 Centres disponibles:', centres);
        this.findCentreByWasherAssignment(centres);
      },
      error: (error) => {
        console.error('Erreur lors de la recherche des centres:', error);
        this.showNoCentreMessage();
      },
    });
  }

  /**
   * Trouver un centre où le laveur est assigné
   */
  findCentreByWasherAssignment(centres: Centres[]): void {
    if (centres.length > 0) {
      const firstCentre = centres[0];
      console.log(
        '🏢 Attribution du premier centre disponible:',
        firstCentre.name
      );

      if (this.currentUser) {
        this.currentUser.centreId = firstCentre.id;
        this.currentCentre = firstCentre;

        // Charger les données après avoir trouvé un centre
        this.loadServicesForCentre(firstCentre.id!);
        this.loadWasherData();
      }
    } else {
      this.showNoCentreMessage();
    }
  }

  /**
   * Afficher un message si aucun centre n'est trouvé
   */
  showNoCentreMessage(): void {
    console.warn('⚠️ Aucun centre trouvé pour ce laveur');
  }

  /**
   * Charge les photos des utilisateurs
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
          this.setDefaultUserPhoto();
        },
      });
    } else {
      this.setDefaultUserPhoto();
    }
  }

  /**
   * Définit la photo par défaut de l'utilisateur
   */
  setDefaultUserPhoto(): void {
    this.currentUser!.photoSafeUrl = this.sanitizer.bypassSecurityTrustUrl(
      'assets/images/default-avatar.png'
    );
  }

  /**
   * Retourne le nom complet de l'utilisateur connecté
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
   */
  getUserRole(): string {
    if (!this.currentUser) return 'Rôle non défini';

    if (this.currentUser.roles && this.currentUser.roles.length > 0) {
      return this.mapRoleIdToName(this.currentUser.roles[0]);
    }

    const role = this.authService.getUserRole();
    return role ? this.mapRoleIdToName(role) : 'Laveur';
  }

  /**
   * Convertit l'ID de rôle en nom lisible
   */
  mapRoleIdToName(roleId: string): string {
    const roleMapping: { [key: string]: string } = {
      '1': 'Admin',
      '2': 'Manager',
      '3': 'Washer',
    };
    return roleMapping[roleId] || 'Laveur';
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

  //#region Centre and Services Methods
  /**
   * Charger les services disponibles pour le centre
   */
  loadServicesForCentre(centreId: string): void {
    this.loadingServices = true;

    this.serviceSettingsService.getServicesByCentre(centreId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.services = response.data.filter((s) => s.isActive);
          console.log('✅ Services chargés:', this.services.length);
        }
        this.loadingServices = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des services:', error);
        this.loadingServices = false;
      },
    });
  }

  /**
   * Obtenir le nom du centre actuel
   */
  getCurrentCentreName(): string {
    return this.currentCentre?.name || 'Centre non défini';
  }
  //#endregion

  //#region Washer Data Methods
  /**
   * Charger toutes les données du laveur
   */
  loadWasherData(): void {
    if (!this.currentCentre?.id || !this.currentUser?.id) {
      console.warn('⚠️ Centre ou utilisateur non défini');
      return;
    }

    this.loadingDashboard = true;

    const filterParams = this.buildFilterParams();

    // Charger toutes les données en parallèle
    forkJoin({
      snapshot: this.dashboardService.getDashboardSnapshot(
        this.currentCentre.id
      ),
      kpis: this.dashboardService.getMainKpis(this.currentCentre.id),
      washCount: this.dashboardService.getLast7DaysWashCount(
        this.currentCentre.id
      ),
      comparison: this.dashboardService.getWeeklyComparison(
        this.currentCentre.id
      ),
    }).subscribe({
      next: (results) => {
        if (results.snapshot.success)
          this.dashboardData = results.snapshot.data;
        if (results.kpis.success) this.kpiData = results.kpis.data;
        if (results.washCount.success)
          this.last7DaysWashCount = results.washCount.data;
        if (results.comparison.success)
          this.weeklyComparison = results.comparison.data;

        // Calculer les statistiques du laveur
        this.calculateWasherStats();

        this.loadingDashboard = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données:', error);
        this.loadingDashboard = false;
      },
    });
  }

  /**
   * Calculer les statistiques personnelles du laveur
   */
  calculateWasherStats(): void {
    if (!this.kpiData) return;

    // Statistiques du jour
    this.washerStats.todayWashCount = this.kpiData.todayWashCount || 0;
    this.washerStats.todayRevenue = this.kpiData.todayRevenue || 0;

    // Calculer le pourcentage d'objectif
    this.washerStats.completedGoalPercentage = Math.round(
      (this.washerStats.todayWashCount / this.washerStats.dailyGoal) * 100
    );

    // Temps moyen (simulé - à adapter selon votre API)
    this.washerStats.averageTimePerWash = 25;

    // Stats de la semaine
    this.washerStats.totalWashesThisWeek = this.last7DaysWashCount.reduce(
      (a, b) => a + b,
      0
    );
    this.washerStats.totalRevenueThisWeek = 0;
  }

  /**
   * Construire les paramètres de filtre
   */
  buildFilterParams(): any {
    const params: any = {
      centreId: this.currentCentre?.id,
      washerId: this.currentUser?.id,
    };

    if (this.selectedService && this.selectedService !== 'all') {
      params.serviceId = this.selectedService;
    }

    if (this.selectedPeriod === 'custom') {
      if (this.startDate && this.endDate) {
        params.startDate = this.startDate;
        params.endDate = this.endDate;
      }
    } else {
      const dateRange = this.calculateDateRange(this.selectedPeriod);
      if (dateRange.startDate && dateRange.endDate) {
        params.startDate = dateRange.startDate;
        params.endDate = dateRange.endDate;
      }
    }

    return params;
  }

  /**
   * Calculer la plage de dates
   */
  calculateDateRange(period: string): {
    startDate?: string;
    endDate?: string;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = today.toISOString().split('T')[0];
    let startDate: string;

    switch (period) {
      case 'today':
        startDate = endDate;
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 6);
        startDate = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        const monthStart = new Date(today);
        monthStart.setDate(today.getDate() - 29);
        startDate = monthStart.toISOString().split('T')[0];
        break;
      default:
        return {};
    }

    return { startDate, endDate };
  }

  /**
   * Rafraîchir les données du dashboard
   */
  refreshDashboardData(): void {
    if (!this.currentCentre?.id) return;

    this.loadingDashboard = true;

    this.dashboardService.refreshDashboard(this.currentCentre.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.dashboardData = response.data;
          this.loadWasherData();
        }
        this.loadingDashboard = false;
      },
      error: (error) => {
        console.error('Erreur lors du rafraîchissement:', error);
        this.loadingDashboard = false;
      },
    });
  }
  //#endregion

  //#region Timer Methods
  /**
   * Démarrer le timer de la session
   */
  startSessionTimer(): void {
    this.sessionStartTime = new Date();
    this.sessionDuration = 0;

    this.sessionTimerSubscription = interval(1000).subscribe(() => {
      this.sessionDuration++;
    });
  }

  /**
   * Démarrer le timer du lavage en cours
   */
  startWashTimer(): void {
    this.currentWashDuration = 0;

    this.washTimerSubscription = interval(1000).subscribe(() => {
      this.currentWashDuration++;
    });
  }

  /**
   * Arrêter le timer du lavage
   */
  stopWashTimer(): void {
    if (this.washTimerSubscription) {
      this.washTimerSubscription.unsubscribe();
    }
    this.currentWashDuration = 0;
  }

  /**
   * Formater une durée en secondes vers HH:MM:SS
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }

  /**
   * Obtenir la durée de session formatée
   */
  getSessionDurationFormatted(): string {
    return this.formatDuration(this.sessionDuration);
  }

  /**
   * Obtenir le statut de la session
   */
  getSessionStatus(): string {
    if (this.currentVehicle) {
      return 'En cours de lavage';
    }
    if (this.vehicleQueue.length > 0) {
      return 'En attente';
    }
    return 'Disponible';
  }
  //#endregion


  //#region Display Mode Methods

  /**
   * Basculer le mode kiosque
   */
  toggleKioskMode(): void {
    this.kioskMode = !this.kioskMode;

    if (this.kioskMode) {
      // Entrer en plein écran si possible
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch((err) => {
          console.log('Erreur plein écran:', err);
        });
      }
    } else {
      // Sortir du plein écran
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }

    console.log('📺 Mode kiosque:', this.kioskMode);
  }

  /**
   * Basculer le mode course
   */
  toggleRaceMode(): void {
    this.raceMode = !this.raceMode;
    console.log('🏁 Mode course:', this.raceMode);

    if (this.raceMode) {
      // Activer des effets visuels ou des notifications spéciales
      alert('Mode course activé ! Dépassez vos objectifs ! 🚀');
    }
  }
  //#endregion

}

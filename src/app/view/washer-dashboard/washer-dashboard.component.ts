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
  imports: [RouterLink, CommonModule, FormsModule, BaseChartDirective],
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
  private setupUserSubscription(): void {
    this.currentUserSubscription = this.authService.currentUser$.subscribe(
      (user) => {
        if (user && user !== this.currentUser) {
          this.currentUser = user;
          this.loadCurrentUserPhoto();
          this.loadWasherCentre();
        }
      }
    );
  }

  /**
   * Configuration de l'écoute des changements de filtre avec debounce
   */
  private setupFilterListener(): void {
    this.filterSubscription = this.filterChangeSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.loadWasherData();
      });
  }

  /**
   * Déclencher le rechargement des données avec debounce
   */
  private triggerFilterChange(): void {
    this.filterChangeSubject.next();
  }

  /**
   * Configuration du rafraîchissement automatique toutes les 30 secondes
   */
  private setupAutoRefresh(): void {
    this.dataRefreshSubscription = interval(30000).subscribe(() => {
      if (this.currentCentre?.id) {
        this.refreshDashboardData();
      }
    });
  }

  /**
   * Nettoye les abonnements
   */
  private cleanupSubscriptions(): void {
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
  private clearTimers(): void {
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
  private handleUserLoaded(user: Users): void {
    this.currentUser = user;
    this.loadCurrentUserPhoto();

    if (user.centreId) {
      console.log('✅ CentreId trouvé dans user:', user.centreId);
      this.loadWasherCentre();
    } else {
      console.log('⚠️ centreId non trouvé, recherche alternative...');
      this.findCentreForWasher();
    }
  }

  /**
   * Méthode de secours pour charger l'utilisateur
   */
  private loadCurrentUserFallback(): void {
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
  private loadWasherCentre(): void {
    if (!this.currentUser?.centreId) {
      this.findCentreForWasher();
      return;
    }

    this.loadingCentre = true;

    this.centresService.getCentreById(this.currentUser.centreId).subscribe({
      next: (centre) => {
        this.currentCentre = centre;
        this.loadingCentre = false;
        console.log('✅ Centre chargé:', centre.name);

        // Charger les services et données du laveur
        this.loadServicesForCentre(centre.id!);
        this.loadWasherData();
      },
      error: (error) => {
        console.error('Erreur lors du chargement du centre:', error);
        this.loadingCentre = false;
        this.findCentreForWasher();
      },
    });
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
  private findCentreByWasherAssignment(centres: Centres[]): void {
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
  private showNoCentreMessage(): void {
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
  private setDefaultUserPhoto(): void {
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
  private mapRoleIdToName(roleId: string): string {
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
  private loadServicesForCentre(centreId: string): void {
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
        this.updateCharts();
        this.loadVehicleQueue();

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
  private calculateWasherStats(): void {
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

    // Mettre à jour le graphique de progression
    this.updateProgressChart();
    this.updateEfficiencyChart();
  }

  /**
   * Construire les paramètres de filtre
   */
  private buildFilterParams(): any {
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
  private calculateDateRange(period: string): {
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

  //#region Vehicle Queue Methods
  /**
   * Charger la file d'attente des véhicules
   */
  private loadVehicleQueue(): void {
    // Simulation - À remplacer par un vrai appel API
    // this.vehicleQueueService.getQueueForWasher(this.currentUser?.id).subscribe(...)

    this.vehicleQueue = [
      {
        id: '1',
        vehicleModel: 'Toyota Camry 2023',
        licensePlate: 'AB-1234-CD',
        serviceType: 'Premium',
        customerName: 'Jean Dupont',
        priority: 'high',
        waitTime: 15,
        bayNumber: '3',
        estimatedDuration: 45,
      },
      {
        id: '2',
        vehicleModel: 'Honda Accord',
        licensePlate: 'EF-5678-GH',
        serviceType: 'Standard',
        customerName: 'Marie Martin',
        priority: 'normal',
        waitTime: 30,
        bayNumber: '5',
        estimatedDuration: 30,
      },
      {
        id: '3',
        vehicleModel: 'BMW X5',
        licensePlate: 'IJ-9012-KL',
        serviceType: 'Express',
        priority: 'urgent',
        waitTime: 5,
        estimatedDuration: 20,
      },
    ];
  }

  /**
   * Obtenir le temps d'attente total
   */
  getTotalWaitTime(): number {
    return this.vehicleQueue.reduce(
      (total, vehicle) => total + vehicle.waitTime,
      0
    );
  }

  /**
   * Obtenir la classe CSS selon la priorité
   */
  getPriorityClass(priority: string): string {
    const classes: { [key: string]: string } = {
      low: 'badge-low',
      normal: 'badge-normal',
      high: 'badge-high',
      urgent: 'badge-urgent',
    };
    return classes[priority] || 'badge-normal';
  }

  /**
   * Démarrer le lavage du véhicule suivant
   */
  startNextWash(): void {
    if (this.vehicleQueue.length === 0 || this.currentVehicle) {
      return;
    }

    // Prendre le premier véhicule de la file
    this.currentVehicle = this.vehicleQueue.shift()!;

    // Démarrer le timer
    this.startWashTimer();

    console.log('🚗 Lavage démarré:', this.currentVehicle.vehicleModel);
  }

  /**
   * Terminer le lavage en cours
   */
  completeCurrentWash(): void {
    if (!this.currentVehicle) return;

    const washDuration = this.currentWashDuration;
    const vehicleModel = this.currentVehicle.vehicleModel;

    // Arrêter le timer
    this.stopWashTimer();

    // Mettre à jour les statistiques
    this.washerStats.todayWashCount++;
    this.washerStats.completedGoalPercentage = Math.round(
      (this.washerStats.todayWashCount / this.washerStats.dailyGoal) * 100
    );

    // Réinitialiser le véhicule actuel
    this.currentVehicle = null;

    // Recharger les données
    this.loadWasherData();

    console.log(`✅ Lavage terminé: ${vehicleModel} en ${washDuration}s`);
  }

  /**
   * Signaler un problème
   */
  reportIssue(description: string): void {
    // Appel API pour signaler le problème
    console.log('⚠️ Problème signalé:', description);
    alert('Problème signalé avec succès. Un manager sera notifié.');
  }

  /**
   * Demander une pause
   */
  requestBreak(): void {
    // Appel API pour demander une pause
    console.log('☕ Pause demandée');
    alert('Demande de pause envoyée au manager.');
  }
  //#endregion

  //#region Timer Methods
  /**
   * Démarrer le timer de la session
   */
  private startSessionTimer(): void {
    this.sessionStartTime = new Date();
    this.sessionDuration = 0;

    this.sessionTimerSubscription = interval(1000).subscribe(() => {
      this.sessionDuration++;
    });
  }

  /**
   * Démarrer le timer du lavage en cours
   */
  private startWashTimer(): void {
    this.currentWashDuration = 0;

    this.washTimerSubscription = interval(1000).subscribe(() => {
      this.currentWashDuration++;
    });
  }

  /**
   * Arrêter le timer du lavage
   */
  private stopWashTimer(): void {
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

  //#region Chart Methods
  /**
   * Mettre à jour tous les graphiques
   */
  private updateCharts(): void {
    this.updateProgressChart();
    this.updateEfficiencyChart();
  }

  /**
   * Mettre à jour le graphique de progression
   */
  private updateProgressChart(): void {
    const completed = this.washerStats.todayWashCount;
    const inProgress = this.currentVehicle ? 1 : 0;
    const remaining = Math.max(
      0,
      this.washerStats.dailyGoal - completed - inProgress
    );

    this.progressChartData = {
      ...this.progressChartData,
      datasets: [
        {
          ...this.progressChartData.datasets[0],
          data: [completed, inProgress, remaining],
        },
      ],
    };
  }

  /**
   * Mettre à jour le graphique d'efficacité
   */
  private updateEfficiencyChart(): void {
    // Générer les labels des 7 derniers jours
    const labels = this.generateLast7DaysLabels();

    // Simuler les temps moyens (à remplacer par de vraies données)
    const averageTimes = this.calculateAverageTimes();

    this.efficiencyChartData = {
      ...this.efficiencyChartData,
      labels: labels,
      datasets: [
        {
          ...this.efficiencyChartData.datasets[0],
          data: averageTimes,
        },
      ],
    };
  }

  /**
   * Générer les labels des 7 derniers jours
   */
  private generateLast7DaysLabels(): string[] {
    const labels: string[] = [];
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      if (i === 0) {
        labels.push('Auj');
      } else {
        labels.push(days[date.getDay()]);
      }
    }

    return labels;
  }

  /**
   * Calculer les temps moyens des 7 derniers jours
   */
  private calculateAverageTimes(): number[] {
    // Simulation - à remplacer par de vraies données
    const times: number[] = [];

    for (let i = 0; i < 7; i++) {
      const washCount = this.last7DaysWashCount[i] || 0;
      if (washCount > 0) {
        // Simuler un temps moyen entre 20 et 30 minutes
        times.push(Math.round(20 + Math.random() * 10));
      } else {
        times.push(0);
      }
    }

    return times;
  }

  /**
   * Obtenir la variation hebdomadaire
   */
  getWeeklyVariation(): number {
    if (!this.weeklyComparison) return 0;

    const currentWeek = this.washerStats.totalWashesThisWeek;
    // --- Changement ici : Utilisez previousWeekWashCount à la place de lastWeekWashCount ---
    const lastWeek = this.weeklyComparison.previousWeekWashCount || 0;

    if (lastWeek === 0) return 0;

    return Math.round(((currentWeek - lastWeek) / lastWeek) * 100);
  }
  //#endregion

  //#region Filter Methods
  /**
   * Gérer le changement de période
   */
  onPeriodChange(event: any): void {
    const newPeriod = event.target.value;
    console.log('🔄 Changement de période:', newPeriod);

    this.selectedPeriod = newPeriod;

    if (this.selectedPeriod !== 'custom') {
      this.startDate = '';
      this.endDate = '';
      this.triggerFilterChange();
    }
  }

  /**
   * Gérer le changement de service
   */
  onServiceChange(event: any): void {
    const newServiceId = event.target.value;
    console.log('🔄 Changement de service:', newServiceId);

    this.selectedService = newServiceId;
    this.triggerFilterChange();
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

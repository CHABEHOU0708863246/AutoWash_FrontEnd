import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/Auth/auth.service';
import { UsersService } from '../../core/services/Users/users.service';
import { Users } from '../../core/models/Users/Users';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { DashboardAlert } from '../../core/models/Dashboards/DashboardAlert';
import { DashboardKpiDto } from '../../core/models/Dashboards/DashboardKpiDto';
import { DashboardSnapshot } from '../../core/models/Dashboards/DashboardSnapshot';
import { WeeklyComparisonDto } from '../../core/models/Dashboards/WeeklyComparisonDto';
import { DashboardsService } from '../../core/services/Dashboards/dashboards.service';
import { FormsModule } from '@angular/forms';
import { Centres } from '../../core/models/Centres/Centres';
import { CentresService } from '../../core/services/Centres/centres.service';
import { BehaviorSubject, debounceTime, distinctUntilChanged, forkJoin, Subscription } from 'rxjs';
import { ServiceSettings } from '../../core/models/Settings/Services/ServiceSettings';
import { ServiceSettingsService } from '../../core/services/ServiceSettings/service-settings.service';

import {
  Chart,
  ChartConfiguration,
  ChartData,
  ChartType,
  registerables
} from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { ApiResponseData } from '../../core/models/ApiResponseData';

// Enregistrer tous les composants Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {

  @ViewChild('salesChart') salesChart?: ElementRef;
  @ViewChild('revenueChart') revenueChart?: ElementRef;
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;


  users: Users[] = []; // Liste complète des utilisateurs.
  displayedUsers: Users[] = []; // Liste des utilisateurs affichés sur la page actuelle.
  currentUser: Users | null = null; // Utilisateur actuellement connecté.
  user: Users | null = null; // Informations sur l'utilisateur connecté.
  isSidebarCollapsed = false;

  // Données du dashboard
  dashboardData: DashboardSnapshot | null = null;
  kpiData: DashboardKpiDto | null = null;
  weeklyComparison: WeeklyComparisonDto | null = null;
  activeAlerts: DashboardAlert[] = [];
  last7DaysRevenue: number[] = [];
  last7DaysWashCount: number[] = [];
  centres: Centres[] = [];
  services: ServiceSettings[] = [];

  // États de chargement
  loadingDashboard = false;
  loadingKpis = false;
  loadingAlerts = false;
  loadingCharts = false;
  loadingCentres = false;
  loadingServices = false;

  // Filtres
  selectedCentreId = '';
  selectedPeriod = 'today';
  selectedService = 'all';
  startDate: string = '';
  endDate: string = '';

  // Configuration des graphiques
  public lineChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        label: 'Revenus (FCFA)',
        data: [],
        fill: true,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
        yAxisID: 'y'
      },
      {
        label: 'Nombre de lavages',
        data: [...this.last7DaysWashCount],
        fill: true,
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(255, 99, 132, 1)',
        yAxisID: 'y1'
      }
    ]
  };

  public lineChartOptions: ChartConfiguration['options'] = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top'
    },
    tooltip: {
      mode: 'index',
      intersect: false
    }
  },
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false
  },
  scales: {
    x: {
      display: true,
      title: {
        display: true,
        text: 'Date'
      }
    },
    y: {
      display: true,
      beginAtZero: true,
      title: {
        display: true,
        text: 'Revenus (FCFA)'
      },
      position: 'left'
    },
    y1: {
      display: true,
      beginAtZero: true,
      title: {
        display: true,
        text: 'Nombre de lavages'
      },
      position: 'right',
      grid: {
        drawOnChartArea: false
      }
    }
  }
};

 public pieChartData: ChartData<'pie'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        '#FF6384',
        '#36A2EB',
        '#FFCE56',
        '#4BC0C0',
        '#9966FF'
      ],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: any, b: any) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value}FCFA (${percentage}%)`;
          }
        }
      }
    }
  };

  public lineChartType: ChartType = 'line';
  public pieChartType: ChartType = 'pie';



  // Sujet pour le debounce des changements de filtre
  private filterChangeSubject = new BehaviorSubject<void>(undefined);

  // Souscriptions
  private currentUserSubscription!: Subscription;
  private filterSubscription!: Subscription;

  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService,
    private router: Router,
    private authService: AuthService,
    private centresService: CentresService,
    private dashboardService: DashboardsService,
    private serviceSettingsService: ServiceSettingsService
  ) {}

  ngOnInit(): void {
    this.getUsers();
    this.loadCurrentUser();
    this.loadCentres();
    this.setupFilterListener();

    // S'abonner aux changements de l'utilisateur connecté
    this.currentUserSubscription = this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();

        // Charger immédiatement les données si un centre est disponible
        if (user.centreId && !this.selectedCentreId) {
          this.selectedCentreId = user.centreId;
          this.loadServicesForCentre(this.selectedCentreId);
          this.loadDashboardData();
        }
      }
    });
  }

  ngAfterViewInit(): void {
    console.log('Dashboard ngAfterViewInit');
    // Forcer la mise à jour des graphiques après l'initialisation de la vue
    setTimeout(() => {
      this.updateCharts();
    }, 100);
  }


  private initializeCharts(): void {
    console.log('Initializing charts with test data');

    // Définir les données de test si elles n'existent pas
    if (this.last7DaysRevenue.length === 0) {
      this.last7DaysRevenue = [];
      this.last7DaysWashCount = [];
    }

    // Mettre à jour immédiatement les graphiques
    this.updateCharts();
  }


  private updateCharts(): void {
    console.log('Updating charts');
    this.updateSalesChart();
    this.updateRevenueChart();
  }

  private updateSalesChart(): void {
    console.log('Updating sales chart', this.last7DaysRevenue);

    try {
      // Générer les labels des 7 derniers jours
      const labels = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        labels.push(date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit'
        }));
      }

      this.lineChartData = {
        ...this.lineChartData,
        labels: labels,
        datasets: [
          {
            label: 'Revenus (FCFA)',
            data: [...this.last7DaysRevenue],
            fill: true,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
            tension: 0.4,
            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
            yAxisID: 'y'
          },
          {
            label: 'Nombre de lavages',
            data: [...this.last7DaysWashCount],
            fill: true,
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 2,
            tension: 0.4,
            pointBackgroundColor: 'rgba(255, 99, 132, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(255, 99, 132, 1)',
            yAxisID: 'y1'
          }
        ]
      };

      console.log('Sales chart updated:', this.lineChartData);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du graphique des ventes:', error);
    }
  }

  private updateRevenueChart(): void {
    console.log('Updating revenue chart', this.services);

    try {
      if (this.services.length > 0) {
        const serviceLabels = this.services.map(service => service.name);
        // Générer des données réalistes basées sur le prix du service
        const serviceData = this.services.map(service => {
          const baseRevenue = service.basePrice* 30; // Simuler 30 utilisation par service
          return Math.floor(baseRevenue + (Math.random() * baseRevenue * 0.5));
        });

        this.pieChartData = {
          ...this.pieChartData,
          labels: serviceLabels,
          datasets: [{
            data: serviceData,
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40'
            ],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        };

        console.log('Revenue chart updated:', this.pieChartData);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du graphique des revenus:', error);
    }
  }

  ngOnDestroy(): void {
    // Nettoyer les souscriptions
    if (this.currentUserSubscription) {
      this.currentUserSubscription.unsubscribe();
    }
    if (this.filterSubscription) {
      this.filterSubscription.unsubscribe();
    }
  }

  /**
   * Configuration de l'écoute des changements de filtre avec debounce
   */
  private setupFilterListener(): void {
    this.filterSubscription = this.filterChangeSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.loadDashboardData();
      });
  }

  /**
   * Déclencher le rechargement des données avec debounce
   */
  private triggerFilterChange(): void {
    this.filterChangeSubject.next();
  }

  /**
   * Réinitialise les données du dashboard
   */
  private resetDashboardData(): void {
    this.dashboardData = null;
    this.kpiData = null;
    this.weeklyComparison = null;
    this.activeAlerts = [];
    this.last7DaysRevenue = [];
    this.last7DaysWashCount = [];
  }

  /**
   * Charger tous les centres
   */
  loadCentres(): void {
    this.loadingCentres = true;
    this.centresService.getAllCentres()
      .subscribe({
        next: (centres) => {
          this.centres = centres;
          this.loadingCentres = false;

          // Sélectionner le centre de l'utilisateur par défaut si disponible
          if (this.currentUser?.centreId && !this.selectedCentreId) {
            this.selectedCentreId = this.currentUser.centreId;
            this.loadServicesForCentre(this.selectedCentreId);
            this.loadDashboardData();
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement des centres:', error);
          this.loadingCentres = false;
        }
      });
  }


  /**
   * Charger toutes les données du dashboard en fonction des filtres
   */
  loadDashboardData(): void {
    if (!this.selectedCentreId) {
      this.resetDashboardData();
      return;
    }

    this.loadingDashboard = true;
    this.loadingKpis = true;
    this.loadingAlerts = true;
    this.loadingCharts = true;

    // Réinitialiser les données avant de charger les nouvelles
    this.resetDashboardData();

    // Construire les paramètres de filtre
    const filterParams = this.buildFilterParams();

    // Charger toutes les données en parallèle avec les filtres
    forkJoin({
      snapshot: this.dashboardService.getDashboardSnapshot(this.selectedCentreId),
      kpis: this.dashboardService.getMainKpis(this.selectedCentreId),
      alerts: this.dashboardService.getActiveAlerts(this.selectedCentreId),
      revenue: this.dashboardService.getLast7DaysRevenue(this.selectedCentreId),
      washCount: this.dashboardService.getLast7DaysWashCount(this.selectedCentreId),
      comparison: this.dashboardService.getWeeklyComparison(this.selectedCentreId)
    }).subscribe({
      next: (results) => {
        if (results.snapshot.success) this.dashboardData = results.snapshot.data;
        if (results.kpis.success) this.kpiData = results.kpis.data;
        if (results.alerts.success) this.activeAlerts = results.alerts.data;
        if (results.revenue.success) this.last7DaysRevenue = results.revenue.data;
        if (results.washCount.success) this.last7DaysWashCount = results.washCount.data;
        if (results.comparison.success) this.weeklyComparison = results.comparison.data;

        this.updateCharts();

        this.loadingDashboard = false;
        this.loadingKpis = false;
        this.loadingAlerts = false;
        this.loadingCharts = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données du dashboard:', error);
        this.loadingDashboard = false;
        this.loadingKpis = false;
        this.loadingAlerts = false;
        this.loadingCharts = false;
      }
    });
  }

  /**
   * Construire les paramètres de filtre à partir des valeurs sélectionnées
   */
  private buildFilterParams(): any {
    const params: any = {};

    // Filtre de période
    if (this.selectedPeriod && this.selectedPeriod !== 'today') {
      params.period = this.selectedPeriod;
    }

    // Filtre de service
    if (this.selectedService && this.selectedService !== 'all') {
      params.serviceId = this.selectedService;
    }

    // Dates personnalisées
    if (this.selectedPeriod === 'custom') {
      if (this.startDate) {
        params.startDate = this.startDate;
      }
      if (this.endDate) {
        params.endDate = this.endDate;
      }
    } else {
      // Calculer les dates en fonction de la période sélectionnée
      const dateRange = this.calculateDateRange(this.selectedPeriod);
      if (dateRange.startDate) {
        params.startDate = dateRange.startDate;
      }
      if (dateRange.endDate) {
        params.endDate = dateRange.endDate;
      }
    }

    return params;
  }


  /**
   * Calculer la plage de dates en fonction de la période sélectionnée
   */
  private calculateDateRange(period: string): { startDate?: string, endDate?: string } {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0]; // Format YYYY-MM-DD
    let startDate: string;

    switch (period) {
      case 'today':
        startDate = endDate;
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        startDate = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        const monthStart = new Date(today);
        monthStart.setMonth(today.getMonth() - 1);
        startDate = monthStart.toISOString().split('T')[0];
        break;
      case 'quarter':
        const quarterStart = new Date(today);
        quarterStart.setMonth(today.getMonth() - 3);
        startDate = quarterStart.toISOString().split('T')[0];
        break;
      case 'year':
        const yearStart = new Date(today);
        yearStart.setFullYear(today.getFullYear() - 1);
        startDate = yearStart.toISOString().split('T')[0];
        break;
      default:
        return {};
    }

    return { startDate, endDate };
  }

  /**
   * Rafraîchir manuellement le dashboard
   */
  refreshDashboard(): void {
    if (!this.selectedCentreId) return;

    this.loadingDashboard = true;
    const filterParams = this.buildFilterParams();

    this.dashboardService.refreshDashboard(this.selectedCentreId)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.dashboardData = response.data;
            // Recharger les autres données avec les filtres
            this.loadDashboardData();
          }
          this.loadingDashboard = false;
        },
        error: (error) => {
          console.error('Erreur lors du rafraîchissement:', error);
          this.loadingDashboard = false;
        }
      });
  }

  /**
   * Gérer le changement de centre
   */
  onCentreChange(): void {
  if (this.selectedCentreId) {
    this.loadServicesForCentre(this.selectedCentreId);
    this.triggerFilterChange();
  } else {
    this.services = [];
    this.updateCharts();
  }
}

  /**
   * Charger les services pour un centre spécifique
   */
  loadServicesForCentre(centreId: string): void {
  this.loadingServices = true;
  this.serviceSettingsService.getServicesByCentre(centreId)
    .subscribe({
      next: (response: ApiResponseData<ServiceSettings[]>) => {
        if (response.success && response.data) {
          this.services = response.data;
        } else {
          this.services = [];
          console.warn('Aucun service trouvé pour ce centre');
        }
        this.loadingServices = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des services:', error);
        this.services = [];
        this.loadingServices = false;
      }
    });
}

  /**
   * Gérer le changement de période
   */
  onPeriodChange(event: any): void {
    this.selectedPeriod = event.target.value;

    // Réinitialiser les dates personnalisées si on change de période
    if (this.selectedPeriod !== 'custom') {
      this.startDate = '';
      this.endDate = '';
      this.triggerFilterChange();
    }
    // Pour la période personnalisée, attendre que les dates soient saisies
  }

  /**
 * Gérer le changement de service
 */
onServiceChange(event: any): void {
  const newServiceId = event.target.value;

  // Si le service a changé, mettre à jour et déclencher le filtre
  if (this.selectedService !== newServiceId) {
    this.selectedService = newServiceId;
    this.triggerFilterChange();
  }
}

  /**
   * Gérer le changement des dates personnalisées
   */
  onDateChange(): void {
    // Valider que la date de fin est postérieure à la date de début
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);

      if (end < start) {
        // Échanger les dates si nécessaire
        [this.startDate, this.endDate] = [this.endDate, this.startDate];
      }
    }

    if (this.selectedPeriod === 'custom' && this.startDate && this.endDate) {
      this.triggerFilterChange();
    }
  }


  /**
   * Réinitialiser tous les filtres aux valeurs par défaut
   */
  resetFilters(): void {
    this.selectedPeriod = 'today';
    this.selectedService = 'all';
    this.startDate = '';
    this.endDate = '';
    this.triggerFilterChange();
  }


  /**
   * Résoudre une alerte
   */
  resolveAlert(alertIndex: number): void {
    if (!this.selectedCentreId) return;

    this.dashboardService.resolveAlert(this.selectedCentreId, alertIndex)
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Mettre à jour localement l'alerte comme résolue
            if (this.activeAlerts[alertIndex]) {
              this.activeAlerts[alertIndex].isResolved = true;
            }
            // Optionnel: recharger les alertes
            this.loadActiveAlerts();
          }
        },
        error: (error) => {
          console.error('Erreur lors de la résolution de l\'alerte:', error);
        }
      });
  }

  /**
   * Charger uniquement les alertes actives
   */
  private loadActiveAlerts(): void {
    if (!this.selectedCentreId) return;

    this.loadingAlerts = true;
    this.dashboardService.getActiveAlerts(this.selectedCentreId)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.activeAlerts = response.data;
          }
          this.loadingAlerts = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des alertes:', error);
          this.loadingAlerts = false;
        }
      });
  }

  /**
   * Obtenir l'icône correspondant au type d'alerte
   */
  getAlertIcon(alertType: string): string {
    switch (alertType) {
      case 'Info':
        return 'fas fa-info-circle';
      case 'Warning':
        return 'fas fa-exclamation-triangle';
      case 'Critical':
        return 'fas fa-exclamation-circle';
      default:
        return 'fas fa-bell';
    }
  }

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
   * Bascule l'état de la barre latérale entre "collapsée" et
   * "étendue".
   * Modifie les classes CSS pour ajuster l'affichage.
   * Cette méthode est appelée lors du clic sur le bouton de
   * basculement de la barre latérale.
   */
    toggleSidebar() {
      this.isSidebarCollapsed = !this.isSidebarCollapsed;

      // Ajoute/retire les classes nécessaires
      const sidebar = document.getElementById('sidebar');
      const mainContent = document.querySelector('.main-content');

      if (sidebar && mainContent) {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('collapsed');
      }
    }


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
}

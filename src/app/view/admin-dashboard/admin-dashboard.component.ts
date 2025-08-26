import { Component, OnInit } from '@angular/core';
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

// 1. IMPORTS À AJOUTER dans admin-dashboard.component.ts
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { ApiResponseData } from '../../core/models/ApiResponseData';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
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
    datasets: []
  };

  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
      }
    },
    scales: {
      x: {
        display: true
      },
      y: {
        display: true,
        beginAtZero: true
      }
    }
  };

  public pieChartData: ChartData<'pie'> = {
    labels: [],
    datasets: []
  };

  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
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


  private updateCharts(): void {
    this.updateSalesChart();
    this.updateRevenueChart();
  }

  private updateSalesChart(): void {
    if (this.last7DaysRevenue.length > 0) {
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
        labels: labels,
        datasets: [
          {
            label: 'Revenus (€)',
            data: this.last7DaysRevenue,
            fill: true,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
            tension: 0.4
          },
          {
            label: 'Nombre de lavages',
            data: this.last7DaysWashCount,
            fill: false,
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 2,
            tension: 0.4
          }
        ]
      };
    }
  }

  private updateRevenueChart(): void {
    if (this.services.length > 0 && this.dashboardData) {
      // Calculer les revenus par service (exemple basé sur vos données)
      const serviceLabels = this.services.map(service => service.name);
      const serviceData = this.services.map(service => {
        // Ici vous devriez calculer le revenu réel par service
        // Pour l'exemple, je génère des données aléatoires
        return Math.floor(Math.random() * 1000) + 100;
      });

      this.pieChartData = {
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
          ]
        }]
      };
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
  onCentreChange(event: any): void {
  const newCentreId = event.target.value;

  if (this.selectedCentreId !== newCentreId) {
    this.selectedCentreId = newCentreId;
    this.selectedService = 'all'; // Réinitialiser le filtre service

    if (this.selectedCentreId) {
      this.loadServicesForCentre(this.selectedCentreId);
    }

    this.triggerFilterChange();
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

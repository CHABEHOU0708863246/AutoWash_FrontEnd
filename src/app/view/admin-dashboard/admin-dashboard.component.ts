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
import {
  BehaviorSubject,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  Subscription,
} from 'rxjs';
import { ServiceSettings } from '../../core/models/Settings/Services/ServiceSettings';
import { ServiceSettingsService } from '../../core/services/ServiceSettings/service-settings.service';

import {
  Chart,
  ChartConfiguration,
  ChartData,
  ChartType,
  registerables,
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
  //#region View Children
  @ViewChild('salesChart') salesChart?: ElementRef;
  @ViewChild('revenueChart') revenueChart?: ElementRef;
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  //#endregion

  //#region Properties
  // Utilisateurs
  users: Users[] = []; // Liste complète des utilisateurs.
  displayedUsers: Users[] = []; // Liste des utilisateurs affichés sur la page actuelle.
  currentUser: Users | null = null; // Utilisateur actuellement connecté.
  user: Users | null = null; // Informations sur l'utilisateur connecté.
  isSidebarCollapsed = false;

  public isPercentageMode = false;
  public activeServicesCount = 0;

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
        yAxisID: 'y',
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
        yAxisID: 'y1',
      },
    ],
  };

  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        display: true,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Revenus (FCFA)',
        },
        position: 'left',
      },
      y1: {
        display: true,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Nombre de lavages',
        },
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  public pieChartData: ChartData<'pie'> = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce(
              (a: any, b: any) => a + b,
              0
            );
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value}FCFA (${percentage}%)`;
          },
        },
      },
    },
  };

  public lineChartType: ChartType = 'line';
  public pieChartType: ChartType = 'pie';

  // Sujet pour le debounce des changements de filtre
  private filterChangeSubject = new BehaviorSubject<void>(undefined);

  // Souscriptions
  private currentUserSubscription!: Subscription;
  private filterSubscription!: Subscription;
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
    this.loadCentres();
    this.setupFilterListener();

    // S'abonner aux changements de l'utilisateur connecté
    this.currentUserSubscription = this.authService.currentUser$.subscribe(
      (user) => {
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
      }
    );
  }

  ngAfterViewInit(): void {
    console.log('Dashboard ngAfterViewInit');
    // Forcer la mise à jour des graphiques après l'initialisation de la vue
    setTimeout(() => {
      this.updateCharts();
    }, 100);
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
  //#endregion

  //#region Dashboard Data Methods
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
      snapshot: this.dashboardService.getDashboardSnapshot(
        this.selectedCentreId
      ),
      kpis: this.dashboardService.getMainKpis(this.selectedCentreId),
      alerts: this.dashboardService.getActiveAlerts(this.selectedCentreId),
      revenue: this.dashboardService.getLast7DaysRevenue(this.selectedCentreId),
      washCount: this.dashboardService.getLast7DaysWashCount(
        this.selectedCentreId
      ),
      comparison: this.dashboardService.getWeeklyComparison(
        this.selectedCentreId
      ),
    }).subscribe({
      next: (results) => {
        if (results.snapshot.success)
          this.dashboardData = results.snapshot.data;
        if (results.kpis.success) this.kpiData = results.kpis.data;
        if (results.alerts.success) this.activeAlerts = results.alerts.data;
        if (results.revenue.success)
          this.last7DaysRevenue = results.revenue.data;
        if (results.washCount.success)
          this.last7DaysWashCount = results.washCount.data;
        if (results.comparison.success)
          this.weeklyComparison = results.comparison.data;

        this.updateCharts();

        this.loadingDashboard = false;
        this.loadingKpis = false;
        this.loadingAlerts = false;
        this.loadingCharts = false;
      },
      error: (error) => {
        console.error(
          'Erreur lors du chargement des données du dashboard:',
          error
        );
        this.loadingDashboard = false;
        this.loadingKpis = false;
        this.loadingAlerts = false;
        this.loadingCharts = false;
      },
    });
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
   * Rafraîchir manuellement le dashboard
   */
  refreshDashboard(): void {
    if (!this.selectedCentreId) return;

    this.loadingDashboard = true;
    const filterParams = this.buildFilterParams();

    this.dashboardService.refreshDashboard(this.selectedCentreId).subscribe({
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
      },
    });
  }
  //#endregion

  //#region Filter Methods
  /**
   * Configuration de l'écoute des changements de filtre avec debounce
   */
  private setupFilterListener(): void {
    this.filterSubscription = this.filterChangeSubject
      .pipe(debounceTime(300), distinctUntilChanged())
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
   * Construire les paramètres de filtre à partir des valeurs sélectionnées
   */
  private buildFilterParams(): any {
    const params: any = {};

    params.centreId = this.selectedCentreId;

    // Filtre de service avec validation
    if (this.selectedService && this.selectedService !== 'all') {
      // Vérifier que le service appartient au centre sélectionné
      const serviceExists = this.services.find(
        (s) => s.id === this.selectedService
      );
      if (serviceExists) {
        params.serviceId = this.selectedService;
      }
    }

    // Dates avec validation
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

  getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Calculer la plage de dates en fonction de la période sélectionnée
   */
  private calculateDateRange(period: string): {
    startDate?: string;
    endDate?: string;
  } {
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
   * Gérer le changement de période
   */
  onPeriodChange(event: any): void {
    const newPeriod = event.target.value;

    // Validation du format de période
    const validPeriods = [
      'today',
      'week',
      'month',
      'quarter',
      'year',
      'custom',
    ];
    if (!validPeriods.includes(newPeriod)) {
      console.error('Période invalide:', newPeriod);
      return;
    }

    this.selectedPeriod = newPeriod;

    // Réinitialiser les dates personnalisées si on change de période
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
    if (this.selectedPeriod !== 'custom') {
      return;
    }

    // Validation des dates
    if (!this.startDate || !this.endDate) {
      return;
    }

    const startDate = new Date(this.startDate);
    const endDate = new Date(this.endDate);
    const today = new Date();

    // Vérification que les dates sont valides
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      alert('Dates invalides. Veuillez sélectionner des dates correctes.');
      this.startDate = '';
      this.endDate = '';
      return;
    }

    // Vérification que la date de fin n'est pas antérieure à la date de début
    if (endDate < startDate) {
      alert('La date de fin doit être postérieure à la date de début.');
      [this.startDate, this.endDate] = [this.endDate, this.startDate];
    }

    // Vérification que les dates ne sont pas dans le futur
    if (startDate > today || endDate > today) {
      alert('Les dates ne peuvent pas être dans le futur.');
      return;
    }

    // Vérification de la plage maximale (ex: 1 an)
    const maxDays = 365;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > maxDays) {
      alert(`La plage de dates ne peut pas dépasser ${maxDays} jours.`);
      return;
    }

    this.triggerFilterChange();
  }

  //#endregion

  //#region Chart Methods

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
    this.updateLineChart();
  }

  /**
   * Mettre à jour le graphique linéaire
   */
  updateLineChart(): void {
    // Mettre à jour les données du graphique linéaire
    const labels = this.generateLast7DaysLabels();

    this.lineChartData = {
      ...this.lineChartData,
      labels: labels,
      datasets: [
        {
          ...this.lineChartData.datasets[0],
          data:
            this.last7DaysRevenue.length > 0
              ? this.last7DaysRevenue
              : [0, 0, 0, 0, 0, 0, 0],
        },
        {
          ...this.lineChartData.datasets[1],
          data:
            this.last7DaysWashCount.length > 0
              ? this.last7DaysWashCount
              : [0, 0, 0, 0, 0, 0, 0],
        },
      ],
    };

    // Forcer la mise à jour du graphique
    if (this.chart) {
      this.chart.update();
    }
  }

  /**
   * Générer les labels des 7 derniers jours
   */
  private generateLast7DaysLabels(): string[] {
    const labels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(
        date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      );
    }
    return labels;
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
        labels.push(
          date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
          })
        );
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
            yAxisID: 'y',
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
            yAxisID: 'y1',
          },
        ],
      };

      console.log('Sales chart updated:', this.lineChartData);
    } catch (error) {
      console.error(
        'Erreur lors de la mise à jour du graphique des ventes:',
        error
      );
    }
  }

  private updateRevenueChart(): void {
    console.log('Updating revenue chart', this.services);

    try {
      if (this.services.length > 0) {
        // Récupérer les revenus réels par service depuis l'API
        this.dashboardService
          .getRevenueByService(this.selectedCentreId, this.buildFilterParams())
          .subscribe({
            next: (
              response: ApiResponseData<
                { serviceName: string; revenue: number }[]
              >
            ) => {
              if (response.success && response.data) {
                this.updateChartWithRealData(response.data);
              } else {
                // Fallback sur les pourcentages si les données absolues sont incohérentes
                this.updateChartWithPercentages();
              }
            },
            error: (error) => {
              console.error(
                'Erreur lors de la récupération des revenus par service:',
                error
              );
              // Utiliser les pourcentages en cas d'erreur
              this.updateChartWithPercentages();
            },
          });
      }
    } catch (error) {
      console.error(
        'Erreur lors de la mise à jour du graphique des revenus:',
        error
      );
      this.updateChartWithPercentages();
    }
  }

  /**
   * Met à jour le graphique avec les données réelles de l'API
   */
  private updateChartWithRealData(
    serviceRevenues: { serviceName: string; revenue: number }[]
  ): void {
    const validRevenues = serviceRevenues.filter((item) => item.revenue > 0);

    if (validRevenues.length === 0) {
      this.updateChartWithPercentages();
      return;
    }

    const totalRevenue = validRevenues.reduce(
      (sum, item) => sum + item.revenue,
      0
    );

    // Vérifier l'incohérence des données : si le total est anormalement bas ou haut
    const isDataInconsistent = totalRevenue < 100 || totalRevenue > 10000000; // Plage réaliste pour des revenus en FCFA

    if (isDataInconsistent) {
      this.updateChartWithPercentages();
      return;
    }

    const serviceLabels = validRevenues.map((item) => item.serviceName);
    const serviceData = validRevenues.map((item) => item.revenue);
    const backgroundColors = this.generateChartColors(validRevenues.length);

    this.pieChartData = {
      labels: serviceLabels,
      datasets: [
        {
          data: serviceData,
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    };

    // Mettre à jour les options pour afficher les valeurs absolues
    this.pieChartOptions = this.getAbsoluteValueOptions();

    console.log('Revenue chart updated with real data:', this.pieChartData);
  }

  /**
   * Met à jour le graphique avec des pourcentages basés sur le prix de base des services
   */
  private updateChartWithPercentages(): void {
    console.log('Using percentage-based revenue chart');

    const activeServices = this.services.filter((service) => service.isActive);

    if (activeServices.length === 0) {
      this.pieChartData = {
        labels: ['Aucun service actif'],
        datasets: [
          {
            data: [100],
            backgroundColor: ['#CCCCCC'],
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      };
      return;
    }

    // Utiliser le prix de base comme indicateur de proportion
    const totalBasePrice = activeServices.reduce(
      (sum, service) => sum + service.basePrice,
      0
    );

    const serviceLabels = activeServices.map((service) => service.name);
    const servicePercentages = activeServices.map((service) =>
      totalBasePrice > 0 ? (service.basePrice / totalBasePrice) * 100 : 0
    );

    const backgroundColors = this.generateChartColors(activeServices.length);

    this.pieChartData = {
      labels: serviceLabels,
      datasets: [
        {
          data: servicePercentages,
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    };

    // Mettre à jour les options pour afficher les pourcentages
    this.pieChartOptions = this.getPercentageOptions();

    console.log('Revenue chart updated with percentages:', this.pieChartData);
  }

  /**
   * Génère des couleurs pour le graphique
   */
  private generateChartColors(count: number): string[] {
    const baseColors = [
      '#FF6384',
      '#36A2EB',
      '#FFCE56',
      '#4BC0C0',
      '#9966FF',
      '#FF9F40',
      '#C9CBCF',
      '#7EBF49',
      '#E74C3C',
      '#9B59B6',
      '#1ABC9C',
      '#F39C12',
    ];

    if (count <= baseColors.length) {
      return baseColors.slice(0, count);
    }

    // Générer des couleurs supplémentaires si nécessaire
    const colors = [...baseColors];
    for (let i = baseColors.length; i < count; i++) {
      const hue = (i * 137.508) % 360; // Utiliser l'angle d'or pour une distribution uniforme
      colors.push(`hsl(${hue}, 70%, 65%)`);
    }

    return colors;
  }

  /**
   * Options pour l'affichage des valeurs absolues
   */
  private getAbsoluteValueOptions(): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            usePointStyle: true,
            padding: 20,
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
              return `${label}: ${value.toLocaleString(
                'fr-FR'
              )} FCFA (${percentage}%)`;
            },
          },
        },
      },
    };
  }

  /**
   * Options pour l'affichage des pourcentages
   */
  private getPercentageOptions(): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            usePointStyle: true,
            padding: 20,
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed;
              return `${label}: ${value.toFixed(1)}%`;
            },
          },
        },
      },
    };
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

  //#region Centre and Service Methods
  /**
   * Charger tous les centres
   */
  loadCentres(): void {
    this.loadingCentres = true;
    this.centresService.getAllCentres().subscribe({
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
      },
    });
  }

  /**
   * Charger les services pour un centre spécifique
   */
  loadServicesForCentre(centreId: string): void {
    this.loadingServices = true;
    this.serviceSettingsService.getServicesByCentre(centreId).subscribe({
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
      },
    });
  }
  //#endregion

  //#region UI Interaction Methods
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

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BehaviorSubject, Subscription, debounceTime } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';

// Models
import { ApiResponseData } from '../../../core/models/ApiResponseData';
import { ServiceSettings } from '../../../core/models/Settings/Services/ServiceSettings';
import { Centres } from '../../../core/models/Centres/Centres';
import { Users } from '../../../core/models/Users/Users';
import { AttendanceRecord } from '../../../core/models/Attendances/AttendanceRecord';
import { AttendanceStatus } from '../../../core/models/Attendances/AttendanceStatus';
import { AttendanceUpdateRequest } from '../../../core/models/Attendances/AttendanceUpdateRequest';

// Services
import { AuthService } from '../../../core/services/Auth/auth.service';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { ServiceSettingsService } from '../../../core/services/ServiceSettings/service-settings.service';
import { AttendancesService } from '../../../core/services/Attendances/attendances.service';

@Component({
  selector: 'app-users-attendance',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './users-attendance.component.html',
  styleUrl: './users-attendance.component.scss',
})
export class UsersAttendanceComponent implements OnInit, OnDestroy {
  //#region Properties
  // Utilisateurs
  users: Users[] = [];
  currentUser: Users | null = null;
  isSidebarCollapsed = false;

  totalEmployees: number = 0;
  presentToday: number = 0;
  absentToday: number = 0;
  lateToday: number = 0;
  attendanceRate: number = 0;

  // Données de présence
  attendanceRecords: AttendanceRecord[] = [];
  filteredRecords: AttendanceRecord[] = [];
  displayRecords: AttendanceRecord[] = [];

  // Centres et services
  centres: Centres[] = [];
  services: ServiceSettings[] = [];

  // États de chargement
  loadingAttendance = false;
  loadingCentres = false;
  loadingServices = false;

  // Filtres
  selectedCentreId = '';
  selectedDate: string = new Date().toISOString().split('T')[0];
  selectedStatus = 'all';
  searchQuery = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;

  // Modal et notifications
  showDetailModal = false;
  selectedRecord: AttendanceRecord | null = null;
  showNotification = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' | 'warning' = 'success';

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
    private serviceSettingsService: ServiceSettingsService,
    private attendanceService: AttendancesService
  ) {}
  //#endregion

  ngOnInit(): void {
    this.getUsers();
    this.loadCurrentUser();
    this.loadCentres();
    this.setupFilterSubscription();

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
            this.loadAttendanceData();
          }
        }
      }
    );
  }

  /**
   * Calcule les statistiques en temps réel
   */
  calculateStatistics(): void {
    this.calculateTotalEmployees();
    this.calculateTodayStats();
    this.updateStatisticsDisplay();
  }

  /**
   * Calcule le nombre total d'employés pour le centre sélectionné
   */
  private calculateTotalEmployees(): void {
    if (this.selectedCentreId) {
      // Filtrer les utilisateurs par centre et rôle "Laveur"
      this.totalEmployees = this.users.filter(
        (user) =>
          user.centreId === this.selectedCentreId &&
          user.roles?.includes('68d92ed00838460ccb3fa732') // Rôle Laveur
      ).length;
    } else {
      // Si pas de centre sélectionné, compter tous les laveurs
      this.totalEmployees = this.users.filter((user) =>
        user.roles?.includes('68d92ed00838460ccb3fa732')
      ).length;
    }
  }

  /**
   * Calcule les statistiques pour aujourd'hui
   */
  private calculateTodayStats(): void {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = this.attendanceRecords.filter(
      (record) => new Date(record.date).toISOString().split('T')[0] === today
    );

    this.presentToday = todayRecords.filter(
      (record) => record.status === 0
    ).length; // Present = 0
    this.absentToday = todayRecords.filter(
      (record) => record.status === 1
    ).length; // Absent = 1

    // Calcul des retards (arrivée après l'heure prévue)
    this.lateToday = todayRecords.filter((record) => {
      if (record.checkInTime && record.scheduledStartTime) {
        const checkIn = new Date(record.checkInTime);
        const scheduledStart = new Date(record.scheduledStartTime);
        return checkIn > scheduledStart;
      }
      return false;
    }).length;

    // Calcul du taux de présence
    this.attendanceRate =
      this.totalEmployees > 0
        ? Math.round((this.presentToday / this.totalEmployees) * 100)
        : 0;
  }

  /**
   * Met à jour l'affichage des statistiques
   */
  private updateStatisticsDisplay(): void {
    // Mettre à jour les éléments DOM
    this.updateElementText('totalEmployees', this.totalEmployees.toString());
    this.updateElementText('presentToday', this.presentToday.toString());
    this.updateElementText('absentToday', this.absentToday.toString());
    this.updateElementText('lateToday', this.lateToday.toString());

    // Mettre à jour les barres de progression
    this.updateProgressBars();
  }

  /**
   * Met à jour le texte d'un élément DOM
   */
  private updateElementText(elementId: string, text: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = text;
    }
  }

  /**
   * Met à jour les barres de progression
   */
  private updateProgressBars(): void {
    // Barre de progression des présences
    const presentPercentage =
      this.totalEmployees > 0
        ? Math.round((this.presentToday / this.totalEmployees) * 100)
        : 0;

    const presentProgress = document.querySelector(
      '.progress-fill'
    ) as HTMLElement;
    if (presentProgress) {
      presentProgress.style.width = `${presentPercentage}%`;
    }

    // Barre de progression des absences
    const absentPercentage =
      this.totalEmployees > 0
        ? Math.round((this.absentToday / this.totalEmployees) * 100)
        : 0;

    const absentProgress = document.querySelector(
      '.progress-fill.absent'
    ) as HTMLElement;
    if (absentProgress) {
      absentProgress.style.width = `${absentPercentage}%`;
    }

    // Mettre à jour les pourcentages affichés
    const presentPercentSpan = document.querySelector(
      '.stat-progress span:first-child'
    ) as HTMLElement;
    if (presentPercentSpan) {
      presentPercentSpan.textContent = `${presentPercentage}%`;
    }

    const absentPercentSpan = document.querySelector(
      '.stat-card:nth-child(3) .stat-progress span'
    ) as HTMLElement;
    if (absentPercentSpan) {
      absentPercentSpan.textContent = `${absentPercentage}%`;
    }
  }

  /**
   * Calcule les tendances par rapport au mois précédent
   */
  calculateTrends(): void {
    // Cette méthode pourrait être implémentée avec des données historiques
    // Pour l'instant, on utilise des valeurs simulées
    this.updateTrendsDisplay();
  }

  /**
   * Met à jour l'affichage des tendances
   */
  private updateTrendsDisplay(): void {
    // Tendances simulées basées sur les données actuelles
    const positiveTrend = this.presentToday > 0 ? 'positive' : 'negative';
    const negativeTrend = this.lateToday > 0 ? 'negative' : 'positive';

    // Mettre à jour les icônes de tendance
    this.updateTrendIcons(positiveTrend, negativeTrend);
  }

  /**
   * Met à jour les icônes de tendance
   */
  private updateTrendIcons(positiveTrend: string, negativeTrend: string): void {
    // Implémentation pour mettre à jour les flèches de tendance
    // Pour l'instant, on garde les valeurs statiques du template
  }

  //#region Helper Methods for Statistics

  /**
   * Calcule le pourcentage de présence
   */
  getAttendancePercentage(): number {
    return this.totalEmployees > 0
      ? Math.round((this.presentToday / this.totalEmployees) * 100)
      : 0;
  }

  /**
   * Calcule le pourcentage d'absence
   */
  getAbsencePercentage(): number {
    return this.totalEmployees > 0
      ? Math.round((this.absentToday / this.totalEmployees) * 100)
      : 0;
  }

  /**
   * Détermine la tendance des employés
   */
  getEmployeeTrend(): string {
    // Simulation basée sur les données actuelles
    return this.totalEmployees > 5 ? '12% ce mois' : 'Stable';
  }

  /**
   * Détermine la tendance des retards
   */
  getLateTrend(): string {
    return this.lateToday > 2 ? 'negative' : 'positive';
  }

  /**
   * Retourne le texte de tendance des retards
   */
  getLateTrendText(): string {
    const trend = this.getLateTrend();
    const percentage = trend === 'negative' ? '5% ce mois' : '2% ce mois';
    return percentage;
  }

  //#endregion

  ngOnDestroy(): void {
    if (this.currentUserSubscription) {
      this.currentUserSubscription.unsubscribe();
    }
    if (this.filterSubscription) {
      this.filterSubscription.unsubscribe();
    }
  }

  //#region Filter Methods
  /**
   * Gère le changement de date
   */
  onDateChange(): void {
    this.loadAttendanceData();
  }

  /**
   * Gère le changement de centre
   */
  onCentreChange(): void {
    if (this.selectedCentreId) {
      this.loadServicesForCentre(this.selectedCentreId);
      this.loadAttendanceData();
    } else {
      // Si "Tous les centres" est sélectionné, vider les données
      this.attendanceRecords = [];
      this.filteredRecords = [];
      this.displayRecords = [];
      this.applyFilters();

      // RECALCULER LES STATISTIQUES
      this.calculateStatistics();
    }
  }

  /**
   * Gère les changements de filtre avec debounce
   */
  onFilterChange(): void {
    this.filterChangeSubject.next();
  }

  /**
   * Applique manuellement les filtres
   */
  applyFilters(): void {
    this.currentPage = 1;
    this.applyFiltersLogic();
    this.updatePaginationControls();
  }

  /**
   * Logique d'application des filtres
   */
  private applyFiltersLogic(): void {
    // Si pas de données, ne rien faire
    if (this.attendanceRecords.length === 0) {
      this.filteredRecords = [];
      this.displayRecords = [];
      this.totalItems = 0;
      this.totalPages = 0;
      return;
    }

    // Filtrage des données
    let filtered = [...this.attendanceRecords];

    // Filtre par statut
    if (this.selectedStatus !== 'all') {
      // Convertir la valeur du filtre en number pour la comparaison
      const statusMap: { [key: string]: number } = {
        Present: 0,
        Absent: 1,
        Late: 2,
        HalfDay: 3,
        Leave: 4,
      };

      const statusValue = statusMap[this.selectedStatus];
      if (statusValue !== undefined) {
        filtered = filtered.filter((record) => record.status === statusValue);
      }
    }

    // Filtre par recherche
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter((record) => {
        const user = this.users.find((u) => u.id === record.userId);
        if (user) {
          const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
          return fullName.includes(query);
        }
        return false;
      });
    }

    this.filteredRecords = filtered;
    this.totalItems = filtered.length;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);

    // Appliquer la pagination
    this.updateDisplayRecords();
  }

  /**
   * Obtient le nom de la personne qui a approuvé la présence
   */
  getApproverName(approverId: string): string {
    if (!approverId) return 'Non validé';

    const approver = this.users.find((u) => u.id === approverId);
    return approver
      ? `${approver.firstName} ${approver.lastName}`
      : `Utilisateur (${approverId})`;
  }

  /**
   * Configure la souscription aux changements de filtre avec debounce
   */
  private setupFilterSubscription(): void {
    this.filterSubscription = this.filterChangeSubject
      .pipe(debounceTime(300))
      .subscribe(() => {
        this.applyFilters();
      });
  }
  //#endregion

  //#region Attendance Data Methods
  /**
   * Charge les données de présence
   */
  loadAttendanceData(): void {
    if (!this.selectedCentreId) {
      console.warn('Aucun centre sélectionné');
      this.showNotificationMessage(
        'Veuillez sélectionner un centre',
        'warning'
      );
      return;
    }

    this.loadingAttendance = true;
    const selectedDate = new Date(this.selectedDate);

    this.attendanceService
      .getDailyAttendance(this.selectedCentreId, selectedDate)
      .subscribe({
        next: (response: ApiResponseData<AttendanceRecord[]>) => {
          if (response.success && response.data) {
            this.attendanceRecords = response.data;
            this.applyFilters();

            // RECALCULER LES STATISTIQUES
            this.calculateStatistics();

            this.showNotificationMessage(
              `${this.attendanceRecords.length} présence(s) chargée(s)`,
              'success'
            );
          } else {
            this.attendanceRecords = [];
            this.filteredRecords = [];
            this.displayRecords = [];
            this.showNotificationMessage(
              'Aucune donnée de présence trouvée pour cette date',
              'warning'
            );
          }
          this.loadingAttendance = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des présences:', error);
          this.attendanceRecords = [];
          this.filteredRecords = [];
          this.displayRecords = [];
          this.loadingAttendance = false;
          this.showNotificationMessage(
            'Erreur lors du chargement des données',
            'error'
          );
        },
      });
  }

  /**
   * Met à jour les enregistrements affichés selon la pagination
   */
  updateDisplayRecords(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayRecords = this.filteredRecords.slice(startIndex, endIndex);

    // Mettre à jour les informations de pagination
    this.updatePaginationInfo();
  }

  /**
   * Met à jour les informations de pagination
   */
  updatePaginationInfo(): void {
    const pageStart = (this.currentPage - 1) * this.pageSize + 1;
    const pageEnd = Math.min(this.currentPage * this.pageSize, this.totalItems);

    // Mettre à jour l'interface
    const pageStartElement = document.getElementById('pageStart');
    const pageEndElement = document.getElementById('pageEnd');
    const totalItemsElement = document.getElementById('totalItems');

    if (pageStartElement) pageStartElement.textContent = pageStart.toString();
    if (pageEndElement) pageEndElement.textContent = pageEnd.toString();
    if (totalItemsElement)
      totalItemsElement.textContent = this.totalItems.toString();
  }

  /**
   * Change de page
   */
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateDisplayRecords();
      this.updatePaginationControls();
    }
  }

  /**
   * Page précédente
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.changePage(this.currentPage - 1);
    }
  }

  /**
   * Page suivante
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.changePage(this.currentPage + 1);
    }
  }

  /**
   * Met à jour les contrôles de pagination
   */
  updatePaginationControls(): void {
    const prevPageBtn = document.getElementById(
      'prevPage'
    ) as HTMLButtonElement;
    const nextPageBtn = document.getElementById(
      'nextPage'
    ) as HTMLButtonElement;
    const paginationPages = document.getElementById('paginationPages');

    if (prevPageBtn) {
      prevPageBtn.disabled = this.currentPage === 1;
    }

    if (nextPageBtn) {
      nextPageBtn.disabled = this.currentPage === this.totalPages;
    }

    if (paginationPages) {
      this.generatePaginationButtons(paginationPages);
    }
  }

  /**
   * Génère les boutons de pagination
   */
  generatePaginationButtons(container: HTMLElement): void {
    container.innerHTML = '';

    // Calculer les pages à afficher (max 5 pages autour de la page courante)
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(this.totalPages, this.currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `page-number ${
        i === this.currentPage ? 'active' : ''
      }`;
      pageBtn.textContent = i.toString();
      pageBtn.addEventListener('click', () => this.changePage(i));
      container.appendChild(pageBtn);
    }
  }

  /**
   * Gère la sélection/désélection de toutes les cases
   */
  toggleSelectAll(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const checkboxes = document.querySelectorAll(
      '.record-checkbox'
    ) as NodeListOf<HTMLInputElement>;

    checkboxes.forEach((cb) => {
      cb.checked = checkbox.checked;
    });
  }
  //#endregion

  //#region Action Methods
  /**
   * Affiche les détails d'un enregistrement de présence
   */
  viewRecordDetails(record: AttendanceRecord): void {
    this.selectedRecord = record;
    this.showDetailModal = true;
  }

  /**
   * Ouvre la modal d'édition pour un enregistrement
   */
  editRecord(record: AttendanceRecord): void {
    this.selectedRecord = record;
    this.showNotificationMessage(
      "Fonctionnalité d'édition à implémenter",
      'warning'
    );
  }

  /**
   * Valide un enregistrement de présence
   */
  validateRecord(record: AttendanceRecord): void {
    if (!record.id) {
      this.showNotificationMessage("ID d'enregistrement manquant", 'error');
      return;
    }

    if (!this.currentUser?.id) {
      this.showNotificationMessage('Utilisateur non connecté', 'error');
      return;
    }

    this.attendanceService
      .validateAttendance(record.id, this.currentUser.id)
      .subscribe({
        next: (response: ApiResponseData<boolean>) => {
          if (response.success) {
            this.showNotificationMessage(
              'Présence validée avec succès',
              'success'
            );
            // Recharger les données pour mettre à jour l'interface
            this.loadAttendanceData();
          } else {
            this.showNotificationMessage(
              response.message || 'Erreur lors de la validation',
              'error'
            );
          }
        },
        error: (error) => {
          console.error('Erreur lors de la validation:', error);
          this.showNotificationMessage('Erreur lors de la validation', 'error');
        },
      });
  }

  /**
   * Met à jour un enregistrement de présence
   */
  updateRecord(recordId: string, updateRequest: AttendanceUpdateRequest): void {
    this.attendanceService.updateAttendance(recordId, updateRequest).subscribe({
      next: (response: ApiResponseData<AttendanceRecord>) => {
        if (response.success) {
          this.showNotificationMessage(
            'Présence mise à jour avec succès',
            'success'
          );
          this.loadAttendanceData();
        } else {
          this.showNotificationMessage(
            response.message || 'Erreur lors de la mise à jour',
            'error'
          );
        }
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour:', error);
        this.showNotificationMessage('Erreur lors de la mise à jour', 'error');
      },
    });
  }

  /**
   * Ferme la modal de détails
   */
  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedRecord = null;
  }

  /**
   * Affiche une notification
   */
  showNotificationMessage(
    message: string,
    type: 'success' | 'error' | 'warning' = 'success'
  ): void {
    this.notificationMessage = message;
    this.notificationType = type;
    this.showNotification = true;

    // Masquer automatiquement après 5 secondes
    setTimeout(() => {
      this.showNotification = false;
    }, 5000);
  }

  /**
   * Masque la notification manuellement
   */
  hideNotification(): void {
    this.showNotification = false;
  }

  /**
   * Exporte les données en rapport
   */
  exportReport(): void {
    if (!this.selectedCentreId) {
      this.showNotificationMessage(
        'Veuillez sélectionner un centre',
        'warning'
      );
      return;
    }

    const startDate = new Date(this.selectedDate);
    this.attendanceService
      .generateWeeklyReport(this.selectedCentreId, startDate)
      .subscribe({
        next: (response: ApiResponseData<Blob>) => {
          if (response.success && response.data) {
            // Créer un lien de téléchargement
            const url = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `rapport-presences-${this.selectedDate}.xlsx`;
            link.click();
            window.URL.revokeObjectURL(url);
            this.showNotificationMessage(
              'Rapport exporté avec succès',
              'success'
            );
          } else {
            this.showNotificationMessage(
              response.message || "Erreur lors de l'export",
              'error'
            );
          }
        },
        error: (error) => {
          console.error("Erreur lors de l'export:", error);
          this.showNotificationMessage(
            "Erreur lors de l'export du rapport",
            'error'
          );
        },
      });
  }
  //#endregion

  /**
   * Obtient le nom complet d'un utilisateur
   */
  getUserFullName(userId: string): string {
    const user = this.users.find((u) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Utilisateur inconnu';
  }

  /**
   * Obtient le nom du centre
   */
  getCentreName(centreId: string): string {
    const centre = this.centres.find((c) => c.id === centreId);
    return centre ? centre.name : 'Centre inconnu';
  }

  /**
   * Formate l'heure pour l'affichage
   */
  formatTime(time: Date | string | undefined): string {
    if (!time) return '-';

    const date = new Date(time);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Obtient la classe CSS pour le statut
   */
  getStatusClass(status: number): string {
    switch (status) {
      case 0: // Present
        return 'status-present';
      case 1: // Absent
        return 'status-absent';
      case 2: // Late
        return 'status-late';
      case 3: // HalfDay
        return 'status-halfday';
      case 4: // Leave
        return 'status-leave';
      default:
        return 'status-unknown';
    }
  }

  /**
   * Obtient le texte du statut
   */
  getStatusText(status: number): string {
    switch (status) {
      case 0: // Present
        return 'Présent';
      case 1: // Absent
        return 'Absent';
      case 2: // Late
        return 'En retard';
      case 3: // HalfDay
        return 'Demi-journée';
      case 4: // Leave
        return 'Congé';
      default:
        return 'Inconnu';
    }
  }

  /**
   * Convertit le statut numérique en valeur pour le filtre
   */
  getStatusForFilter(status: number): string {
    switch (status) {
      case 0:
        return 'Present';
      case 1:
        return 'Absent';
      case 2:
        return 'Late';
      case 3:
        return 'HalfDay';
      case 4:
        return 'Leave';
      default:
        return 'Unknown';
    }
  }

  //#region User Management Methods
  getUsers(): void {
    this.usersService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loadUserPhotos();

        // RECALCULER LES STATISTIQUES
        this.calculateStatistics();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des utilisateurs', error);
      },
    });
  }

  loadCurrentUser(): void {
    this.authService.loadCurrentUserProfile().subscribe({
      next: (user) => {
        if (user) {
          this.currentUser = user;
          this.loadCurrentUserPhoto();
        } else {
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

  loadUserPhotos(): void {
    this.users.forEach((user) => {
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
          this.currentUser!.photoSafeUrl =
            this.sanitizer.bypassSecurityTrustUrl(
              'assets/images/default-avatar.png'
            );
        },
      });
    } else {
      this.currentUser.photoSafeUrl = this.sanitizer.bypassSecurityTrustUrl(
        'assets/images/default-avatar.png'
      );
    }
  }

  getFullName(): string {
    if (this.currentUser) {
      const firstName = this.currentUser.firstName || '';
      const lastName = this.currentUser.lastName || '';
      return `${firstName} ${lastName}`.trim() || 'Utilisateur';
    }
    return 'Utilisateur';
  }

  getUserRole(): string {
    if (!this.currentUser) return 'Rôle non défini';

    if (this.currentUser.roles && this.currentUser.roles.length > 0) {
      return this.mapRoleIdToName(this.currentUser.roles[0]);
    }

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
          this.loadAttendanceData();
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des centres:', error);
        this.loadingCentres = false;
      },
    });
  }

  loadServicesForCentre(centreId: string): void {
    this.loadingServices = true;
    this.serviceSettingsService.getServicesByCentre(centreId).subscribe({
      next: (response: ApiResponseData<ServiceSettings[]>) => {
        if (response.success && response.data) {
          this.services = response.data;
        } else {
          this.services = [];
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

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    if (sidebar && mainContent) {
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('collapsed');
    }
  }

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

  //#region Export Methods
  /**
   * Exporte le rapport hebdomadaire
   */
  exportWeeklyReport(): void {
    if (!this.selectedCentreId) {
      this.showNotificationMessage(
        'Veuillez sélectionner un centre',
        'warning'
      );
      return;
    }

    const startDate = new Date(this.selectedDate);
    this.attendanceService
      .generateWeeklyReport(this.selectedCentreId, startDate)
      .subscribe({
        next: (response: ApiResponseData<Blob>) => {
          if (response.success && response.data) {
            this.downloadFile(
              response.data,
              `rapport-hebdomadaire-${this.selectedDate}.xlsx`
            );
            this.showNotificationMessage(
              'Rapport hebdomadaire exporté avec succès',
              'success'
            );
          } else {
            this.showNotificationMessage(
              response.message || "Erreur lors de l'export",
              'error'
            );
          }
        },
        error: (error) => {
          console.error("Erreur lors de l'export hebdomadaire:", error);
          this.showNotificationMessage(
            "Erreur lors de l'export du rapport hebdomadaire",
            'error'
          );
        },
      });
  }

  /**
   * Exporte le rapport mensuel
   */
  exportMonthlyReport(): void {
    if (!this.selectedCentreId) {
      this.showNotificationMessage(
        'Veuillez sélectionner un centre',
        'warning'
      );
      return;
    }

    const currentDate = new Date(this.selectedDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    this.attendanceService
      .generateMonthlyReport(this.selectedCentreId, year, month)
      .subscribe({
        next: (response: ApiResponseData<Blob>) => {
          if (response.success && response.data) {
            this.downloadFile(
              response.data,
              `rapport-mensuel-${year}-${month}.xlsx`
            );
            this.showNotificationMessage(
              'Rapport mensuel exporté avec succès',
              'success'
            );
          } else {
            this.showNotificationMessage(
              response.message || "Erreur lors de l'export",
              'error'
            );
          }
        },
        error: (error) => {
          console.error("Erreur lors de l'export mensuel:", error);
          this.showNotificationMessage(
            "Erreur lors de l'export du rapport mensuel",
            'error'
          );
        },
      });
  }

  /**
   * Exporte le rapport annuel
   */
  exportAnnualReport(): void {
    if (!this.selectedCentreId) {
      this.showNotificationMessage(
        'Veuillez sélectionner un centre',
        'warning'
      );
      return;
    }

    const currentDate = new Date(this.selectedDate);
    const year = currentDate.getFullYear();

    this.attendanceService
      .generateAnnualReport(this.selectedCentreId, year)
      .subscribe({
        next: (response: ApiResponseData<Blob>) => {
          if (response.success && response.data) {
            this.downloadFile(response.data, `rapport-annuel-${year}.xlsx`);
            this.showNotificationMessage(
              'Rapport annuel exporté avec succès',
              'success'
            );
          } else {
            this.showNotificationMessage(
              response.message || "Erreur lors de l'export",
              'error'
            );
          }
        },
        error: (error) => {
          console.error("Erreur lors de l'export annuel:", error);
          this.showNotificationMessage(
            "Erreur lors de l'export du rapport annuel",
            'error'
          );
        },
      });
  }

  /**
   * Télécharge un fichier blob
   */
  private downloadFile(blob: Blob, filename: string): void {
    // Créer un URL pour le blob
    const url = window.URL.createObjectURL(blob);

    // Créer un lien de téléchargement
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    // Simuler le clic pour déclencher le téléchargement
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Libérer l'URL
    window.URL.revokeObjectURL(url);
  }

  /**
   * Rafraîchit les données
   */
  refreshData(): void {
    this.loadAttendanceData();
    this.showNotificationMessage('Données actualisées', 'success');
  }
  //#endregion
}

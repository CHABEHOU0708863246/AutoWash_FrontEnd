import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { Observable, Subject, catchError, finalize, forkJoin, of, takeUntil } from 'rxjs';

// Services
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { AttendancesService } from '../../../core/services/Attendances/attendances.service';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { NotificationService } from '../../../core/services/Notification/notification.service';

// Models
import { Users } from '../../../core/models/Users/Users';
import { AttendanceRecord } from '../../../core/models/Attendances/AttendanceRecord';
import { Centres } from '../../../core/models/Centres/Centres';
import { ApiResponseData } from '../../../core/models/ApiResponseData';

@Component({
  selector: 'app-attendance-today',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './attendance-today.component.html',
  styleUrl: './attendance-today.component.scss'
})
export class AttendanceTodayComponent implements OnInit, OnDestroy {
  //#region Properties

  // Utilisateur courant (le laveur)
  currentUser: Users | null = null;
  currentCentre: Centres | null = null;
  isSidebarCollapsed = false;

  approversCache: Map<string, string> = new Map<string, string>();

  // Données de présence
  todayAttendance: AttendanceRecord | null = null;
  isLoading = false;

  // Toutes les présences du centre pour filtrer
  allTodayAttendances: AttendanceRecord[] = [];

  approverNames: Map<string, string> = new Map();

  // Historique récent (7 derniers jours)
  recentAttendance: AttendanceRecord[] = [];
  loadingHistory = false;

  // Statistiques
  attendanceStats = {
    totalDaysWorked: 0,
    totalDaysAbsent: 0,
    totalDaysLate: 0,
    attendanceRate: 0,
    currentStreak: 0
  };

  // Dates
  today: Date = new Date();
  todayFormatted: string = '';

  // Souscription pour cleanup
  private destroy$ = new Subject<void>();

  //#endregion

  //#region Constructor
  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService,
    private router: Router,
    private authService: AuthService,
    private attendanceService: AttendancesService,
    private centresService: CentresService,
    private notificationService: NotificationService
  ) {
    this.todayFormatted = this.formatDateForDisplay(this.today);
  }
  //#endregion

  //#region Lifecycle Hooks
  ngOnInit(): void {
    this.loadCurrentUser();
    this.setupUserSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      }
    });
  }

  /**
   * Setup des souscriptions utilisateur
   */
  private setupUserSubscriptions(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user && user.id !== this.currentUser?.id) {
        this.currentUser = user;
        this.loadWasherCentre();
      }
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
      }
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
          this.loadTodayAttendance();
          // L'historique sera chargé une fois que nous avons les données d'aujourd'hui
        } else {
          console.warn('Centre retourné invalide');
          this.findCentreForWasher();
        }
      },
      error: (error) => {
        console.error('Erreur chargement centre par ID:', error);
        this.findCentreForWasher();
      }
    });
  }

  /**
   * Cherche un centre pour le laveur parmi tous les centres
   */
  private findCentreForWasher(): void {
    this.centresService.getAllCentres().subscribe({
      next: (centres) => {
        if (centres.length > 0) {
          this.currentCentre = centres[0];

          if (this.currentUser && this.currentCentre.id) {
            this.currentUser.centreId = this.currentCentre.id;
          }

          console.log(`🏢 Centre attribué: ${this.currentCentre.name}`);
          this.loadTodayAttendance();
        } else {
          console.warn('Aucun centre disponible');
          this.showNoCentreMessage();
        }
      },
      error: (error) => {
        console.error('Erreur recherche centres:', error);
        this.showNoCentreMessage();
      }
    });
  }

  /**
   * Affiche un message si aucun centre n'est trouvé
   */
  private showNoCentreMessage(): void {
    this.notificationService.warning(
      'Centre non assigné',
      'Aucun centre ne vous est actuellement assigné. Contactez votre manager.'
    );
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
              this.currentUser.photoSafeUrl = this.sanitizer.bypassSecurityTrustUrl(
                reader.result as string
              );
            }
          };
          reader.readAsDataURL(blob);
        },
        error: () => {
          this.setDefaultUserPhoto();
        }
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
      '4': 'Employé'
    };
    return roleMapping[roleId] || 'Laveur';
  }
  //#endregion

  //#region Attendance Management Methods
  /**
   * Charge la présence d'aujourd'hui pour le laveur
   */
  loadTodayAttendance(): void {
    if (!this.currentUser?.id || !this.currentCentre?.id) {
      console.warn('Utilisateur ou centre non défini');
      return;
    }

    this.isLoading = true;

    // CORRECTION : Utiliser la méthode existante getDailyAttendance
    this.attendanceService.getDailyAttendance(this.currentCentre.id, this.today)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Erreur chargement des présences:', error);
          this.notificationService.warning('Attention', 'Impossible de charger les présences du centre');
          return of({ success: false, data: [] } as unknown as ApiResponseData<AttendanceRecord[]>);
        }),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.allTodayAttendances = response.data;

            // Filtrer pour trouver la présence de l'utilisateur courant
            const userAttendance = response.data.find(record =>
              record.userId === this.currentUser?.id
            );

            if (userAttendance) {
              this.todayAttendance = userAttendance;
              console.log('Présence trouvée pour aujourd\'hui:', this.todayAttendance);
            } else {
              this.todayAttendance = null;
              console.log('Aucune présence enregistrée pour vous aujourd\'hui');
            }

            // Charger l'historique une fois que nous avons les données d'aujourd'hui
            this.loadAttendanceHistory();
          } else {
            this.allTodayAttendances = [];
            this.todayAttendance = null;
            this.loadAttendanceHistory();
          }
        }
      });
  }

  /**
   * Charge l'historique des présences du centre (30 derniers jours)
   * puis filtre pour l'utilisateur courant
   */
  loadAttendanceHistory(): void {
  if (!this.currentUser?.id || !this.currentCentre?.id) {
    console.warn('Utilisateur ou centre non défini');
    return;
  }

  this.loadingHistory = true;

  // Essayer d'abord avec la nouvelle méthode
  this.loadAttendanceWithFallback();
}

/**
 * Charge l'historique avec fallback en cas d'échec
 */
private loadAttendanceWithFallback(): void {
  // VÉRIFICATION DE SÉCURITÉ : S'assurer que currentUser n'est pas null
  if (!this.currentUser || !this.currentUser.id) {
    console.warn('Impossible de charger l\'historique: utilisateur non défini');
    this.loadingHistory = false;
    this.recentAttendance = [];
    this.calculateAttendanceStats();
    return;
  }

  // Calculer la période (7 derniers jours)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  console.log(`📅 Tentative de chargement historique pour ${this.currentUser.id}`, {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  });

  // Essayer la méthode spécifique d'historique
  // Ici this.currentUser n'est plus null grâce à la vérification
  this.attendanceService.getMyAttendanceHistory(this.currentUser.id, startDate, endDate)
    .pipe(
      takeUntil(this.destroy$),
      // Si cette méthode échoue, essayer une méthode alternative
      catchError(error => {
        console.warn('Méthode getMyAttendanceHistory échouée, tentative avec fallback...', error);
        return this.loadAttendanceFallback(startDate, endDate);
      }),
      finalize(() => this.loadingHistory = false)
    )
    .subscribe({
      next: (response) => {
        this.handleAttendanceHistoryResponse(response);
      },
      error: (error) => {
        console.error('Erreur définitive chargement historique:', error);
        this.recentAttendance = [];
        this.calculateAttendanceStats();
      }
    });
}

/**
 * Méthode de fallback pour charger l'historique
 */
private loadAttendanceFallback(startDate: Date, endDate: Date): Observable<ApiResponseData<AttendanceRecord[]>> {
  console.log('🔄 Utilisation de la méthode de fallback pour l\'historique');

  // Option 1: Essayer une autre méthode si elle existe
  // Option 2: Générer des données de démo (pour développement uniquement)
  // Option 3: Retourner un tableau vide

  // Pour l'instant, retourner un tableau vide
  return of({
    success: false,
    message: 'Historique non disponible',
    data: []
  } as ApiResponseData<AttendanceRecord[]>);
}

/**
 * Traite la réponse de l'historique
 */
private handleAttendanceHistoryResponse(response: ApiResponseData<AttendanceRecord[]>): void {
  if (response.success && response.data && response.data.length > 0) {
    // Trier par date décroissante (plus récent d'abord)
    this.recentAttendance = response.data.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Limiter à 7 jours maximum
    if (this.recentAttendance.length > 7) {
      this.recentAttendance = this.recentAttendance.slice(0, 7);
    }

    console.log(`✅ Historique chargé: ${this.recentAttendance.length} enregistrements`, this.recentAttendance);

    // Calculer les statistiques
    this.calculateAttendanceStats();

    // Charger les noms des approbateurs
    this.loadApproverNamesForHistory();
  } else {
    // Si pas de données, charger les données d'aujourd'hui comme historique minimal
    this.handleNoHistoryData(response.message);
  }
}

/**
 * Gère le cas où il n'y a pas d'historique
 */
private handleNoHistoryData(message?: string): void {
  console.log('📊 Aucun historique disponible', message);
  this.recentAttendance = [];

  // Si on a une présence aujourd'hui, l'ajouter à l'historique
  if (this.todayAttendance) {
    this.recentAttendance = [this.todayAttendance];
    console.log('📅 Utilisation de la présence du jour comme historique');
  }

  this.calculateAttendanceStats();
}

/**
 * Version alternative: Charger l'historique jour par jour
 * (Si l'API supporte getDailyAttendance)
 */
private loadAttendanceDayByDay(): void {
  if (!this.currentUser?.id || !this.currentCentre?.id) {
    this.loadingHistory = false;
    return;
  }

  const promises: Observable<ApiResponseData<AttendanceRecord[]>>[] = [];
  const allAttendances: AttendanceRecord[] = [];

  // Créer une date pour chaque jour des 7 derniers jours
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Appeler l'API pour chaque jour
    const dailyObservable = this.attendanceService.getDailyAttendance(this.currentCentre.id, date)
      .pipe(
        catchError(error => {
          console.warn(`Erreur pour le jour ${date.toDateString()}`, error);
          return of({ success: false, data: [] } as unknown as ApiResponseData<AttendanceRecord[]>);
        })
      );

    promises.push(dailyObservable);
  }

  // Attendre toutes les réponses
  forkJoin(promises).pipe(
    takeUntil(this.destroy$),
    finalize(() => this.loadingHistory = false)
  ).subscribe({
    next: (responses) => {
      // Combiner toutes les réponses
      responses.forEach(response => {
        if (response.success && response.data) {
          // Filtrer pour ne garder que la présence de l'utilisateur courant
          const userAttendance = response.data.find(record =>
            record.userId === this.currentUser?.id
          );

          if (userAttendance) {
            allAttendances.push(userAttendance);
          }
        }
      });

      // Trier par date
      this.recentAttendance = allAttendances.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      console.log(`📅 Historique par jour chargé: ${this.recentAttendance.length} jours`);

      this.calculateAttendanceStats();
      this.loadApproverNamesForHistory();
    },
    error: (error) => {
      console.error('Erreur chargement historique par jour:', error);
      this.recentAttendance = [];
      this.calculateAttendanceStats();
    }
  });
}

/**
 * Charge les présences des 7 derniers jours (au lieu de 30)
 */
private loadLast30DaysAttendance(): void {
  if (!this.currentUser || !this.currentCentre) {
    console.warn('Utilisateur ou centre non défini');
    this.loadingHistory = false;
    return;
  }

  this.loadingHistory = true;

  // CORRECTION : Charger seulement 7 derniers jours (au lieu de 30)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7); // Seulement 7 jours

  // Utiliser l'API pour récupérer l'historique réel
  this.attendanceService.getMyAttendanceHistory(this.currentUser.id, startDate, endDate)
    .pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Erreur chargement historique:', error);
        return of({ success: false, data: [] } as unknown as ApiResponseData<AttendanceRecord[]>);
      }),
      finalize(() => this.loadingHistory = false)
    )
    .subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Trier par date décroissante (plus récent d'abord)
          this.recentAttendance = response.data.sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          });

          console.log(`✅ Historique chargé (7 derniers jours): ${this.recentAttendance.length} enregistrements`);

          // CORRECTION : Filtrer pour n'avoir que 7 jours maximum
          if (this.recentAttendance.length > 7) {
            this.recentAttendance = this.recentAttendance.slice(0, 7);
          }

          // Calculer les statistiques basées sur les VRAIES données
          this.calculateAttendanceStats();

          // Charger les noms des approbateurs pour l'historique
          this.loadApproverNamesForHistory();
        } else {
          this.recentAttendance = [];
          this.calculateAttendanceStats();
        }
      }
    });
}

/**
 * Charge les noms des approbateurs pour l'historique
 */
private loadApproverNamesForHistory(): void {
  const approverIds = new Set<string>();

  // Collecter tous les IDs uniques des approbateurs
  this.recentAttendance.forEach(record => {
    if (record.approvedBy) {
      approverIds.add(record.approvedBy);
    }
  });

  // Charger les noms pour chaque approbateur unique
  approverIds.forEach(approverId => {
    if (!this.approverNames.has(approverId)) {
      this.loadApproverName(approverId);
    }
  });
}

/**
 * Crée un objet Date avec l'heure spécifiée
 */
private createTimeDate(baseDate: Date, hour: number): Date {
  const timeDate = new Date(baseDate);
  timeDate.setHours(hour, 0, 0, 0);
  return timeDate;
}

/**
 * Génère un statut aléatoire (pour la simulation)
 */
private getRandomStatus(date: Date): number {
  const day = date.getDay();
  const hour = date.getHours();

  // Weekends = absents
  if (day === 0 || day === 6) return 1; // Absent

  // Lundi = possible retard
  if (day === 1 && Math.random() > 0.7) return 2; // Late

  // Vendredi = possible demi-journée
  if (day === 5 && Math.random() > 0.8) return 3; // HalfDay

  // Sinon présent
  return 0; // Present
}


  /**
   * Formate une heure pour une date donnée
   */
  private formatTimeForDate(date: Date, hour: number): string {
    const newDate = new Date(date);
    newDate.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
    return newDate.toISOString();
  }

/**
 * Calcule les statistiques de présence
 */
private calculateAttendanceStats(): void {
  // CORRECTION : Toujours réinitialiser les stats
  this.attendanceStats = {
    totalDaysWorked: 0,
    totalDaysAbsent: 0,
    totalDaysLate: 0,
    attendanceRate: 0,
    currentStreak: 0
  };

  if (this.recentAttendance.length === 0) {
    console.log('📊 Aucune donnée pour calculer les statistiques');
    return;
  }

  const stats = {
    totalDaysWorked: 0,
    totalDaysAbsent: 0,
    totalDaysLate: 0,
    attendanceRate: 0,
    currentStreak: 0
  };

  // CORRECTION : Nous allons considérer TOUS les jours de l'historique
  // Le calcul doit être basé sur l'historique réel chargé (7 jours)
  const totalDays = this.recentAttendance.length;

  console.log(`📊 Calcul des statistiques sur ${totalDays} jours enregistrés`);

  // CORRECTION : Calcul précis basé sur chaque jour de l'historique
  this.recentAttendance.forEach(record => {
    const status = record.status;
    const recordDate = new Date(record.date);
    const dayOfWeek = recordDate.getDay();

    // Compter chaque jour enregistré
    switch (status) {
      case 0: // Present
        stats.totalDaysWorked++;
        break;
      case 1: // Absent
        stats.totalDaysAbsent++;
        break;
      case 2: // Late
        stats.totalDaysLate++;
        stats.totalDaysWorked++; // En retard mais présent
        break;
      case 3: // HalfDay
        // CORRECTION : Une demi-journée compte pour 0.5 jour travaillé
        stats.totalDaysWorked += 0.5;
        break;
      case 4: // Leave
        // CORRECTION : Congé payé, non compté dans les absences ni dans les jours travaillés
        // Pour le taux de présence, on peut considérer que c'est un jour "autorisé"
        break;
      default:
        // Statut inconnu
        break;
    }
  });

  // CORRECTION : Calcul du taux de présence basé sur le nombre de jours enregistrés
  // Le taux = (jours travaillés / total des jours enregistrés) * 100
  // Note: Un jour de congé (Leave) n'est pas un jour d'absence
  if (totalDays > 0) {
    // Pour le taux, on ne compte pas les congés comme des absences
    const joursTravaillables = this.recentAttendance.filter(r => r.status !== 4).length;

    if (joursTravaillables > 0) {
      stats.attendanceRate = Math.round((stats.totalDaysWorked / joursTravaillables) * 100);
    } else {
      stats.attendanceRate = 0;
    }
  }

  // CORRECTION : Calcul de la série actuelle
  stats.currentStreak = this.calculateCurrentStreak();

  // Mettre à jour les statistiques
  this.attendanceStats = stats;
  console.log('📊 Statistiques calculées:', stats);
}

  /**
   * Calcule la série de jours consécutifs présents
   */
private calculateCurrentStreak(): number {
  let streak = 0;

  // Trier par date décroissante
  const sortedAttendance = [...this.recentAttendance].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Parcourir depuis aujourd'hui
  for (const record of sortedAttendance) {
    const status = record.status;
    const recordDate = new Date(record.date);
    const day = recordDate.getDay();

    // Ignorer les weekends
    if (day === 0 || day === 6) {
      continue;
    }

    // Vérifier si c'est un jour de présence
    if (status === 0 || status === 2) { // Présent ou en retard
      streak++;
    } else if (status === 1) { // Absent
      break; // Arrêter le comptage
    } else if (status === 3) { // Demi-journée
      streak += 0.5;
    }
    // Le congé (4) ne brise pas la série
  }

  console.log(`🔥 Série actuelle: ${streak} jours`);
  return streak;
}

  /**
   * Rafraîchit les données de présence
   */
  refreshData(): void {
    this.loadTodayAttendance();
  }
  //#endregion

  //#region UI Helper Methods
  /**
   * Formate une date pour l'affichage
   */
  formatDateForDisplay(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Formate une date courte
   */
  formatShortDate(dateString: string | Date): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';

      return date.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      });
    } catch {
      return 'Date invalide';
    }
  }

  /**
   * Formate une heure
   */
  formatTime(time: Date | string | undefined): string {
    if (!time) return '-';

    try {
      const date = new Date(time);
      if (isNaN(date.getTime())) return '-';

      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  }

  /**
   * Retourne le texte du statut
   */
  getStatusText(status: number | undefined): string {
    if (status === undefined) return 'Non pointé';

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
   * Retourne la classe CSS pour le statut
   */
  getStatusClass(status: number | undefined): string {
    if (status === undefined) return 'status-unknown';

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
   * Retourne l'icône pour le statut
   */
  getStatusIcon(status: number | undefined): string {
    if (status === undefined) return 'fa-question-circle';

    switch (status) {
      case 0: // Present
        return 'fa-check-circle';
      case 1: // Absent
        return 'fa-times-circle';
      case 2: // Late
        return 'fa-clock';
      case 3: // HalfDay
        return 'fa-clock-half';
      case 4: // Leave
        return 'fa-umbrella-beach';
      default:
        return 'fa-question-circle';
    }
  }

  /**
   * Retourne la couleur pour le statut
   */
  getStatusColor(status: number | undefined): string {
    if (status === undefined) return '#6c757d';

    switch (status) {
      case 0: // Present
        return '#28a745';
      case 1: // Absent
        return '#dc3545';
      case 2: // Late
        return '#ffc107';
      case 3: // HalfDay
        return '#17a2b8';
      case 4: // Leave
        return '#6f42c1';
      default:
        return '#6c757d';
    }
  }

  /**
   * Vérifie si le statut est positif (présent/en retard/demi-journée)
   */
  isPositiveStatus(status: number | undefined): boolean {
    return status === 0 || status === 2 || status === 3;
  }

  /**
   * Retourne le nom de la personne qui a validé
   */
  getApproverName(approverId: string | undefined): string {
  if (!approverId) return 'Non validé';

  // Vérifier si le nom est déjà en cache
  if (this.approverNames.has(approverId)) {
    return this.approverNames.get(approverId)!;
  }

  // Sinon, charger le nom depuis le service
  this.loadApproverName(approverId);
  return 'Chargement...';
}

/**
 * Charge le nom d'un validateur depuis l'API
 */
private loadApproverName(approverId: string): void {
  this.usersService.getUserById(approverId).subscribe({
    next: (user) => {
      if (user) {
        const fullName = `${user.firstName} ${user.lastName}`.trim();
        this.approverNames.set(approverId, fullName || 'Manager');
      } else {
        this.approverNames.set(approverId, 'Manager');
      }
    },
    error: (error) => {
      console.error('Erreur lors du chargement du nom de l\'approbateur:', error);
      this.approverNames.set(approverId, 'Manager');
    }
  });
}

  /**
   * Vérifie si la présence est validée
   */
  isAttendanceValidated(): boolean {
    return this.todayAttendance?.approvedBy !== undefined && this.todayAttendance.approvedBy !== null;
  }

  /**
   * Retourne le message à afficher si pas de présence
   */
  getNoAttendanceMessage(): string {
    if (this.isLoading) {
      return 'Chargement de votre présence...';
    }

    const now = new Date();
    const hour = now.getHours();

    if (hour < 9) {
      return 'Votre présence sera enregistrée après 9h';
    } else if (hour < 12) {
      return 'Votre présence n\'a pas encore été enregistrée pour aujourd\'hui';
    } else {
      return 'Aucune présence enregistrée pour aujourd\'hui. Contactez votre manager.';
    }
  }

  /**
   * Retourne le nom du centre actuel
   */
  getCurrentCentreName(): string {
    return this.currentCentre?.name || 'Centre non défini';
  }

  /**
   * Retourne le nombre total de présences aujourd'hui dans le centre
   */
  getTotalPresentToday(): number {
    return this.allTodayAttendances.filter(record =>
      record.status === 0 || record.status === 2 || record.status === 3
    ).length;
  }

  /**
   * Retourne le nombre total d'absents aujourd'hui dans le centre
   */
  getTotalAbsentToday(): number {
    return this.allTodayAttendances.filter(record => record.status === 1).length;
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
}

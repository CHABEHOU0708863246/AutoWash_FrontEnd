import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { Users } from '../../../core/models/Users/Users';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { ProfitabilityService } from '../../../core/services/Profitability/profitability.service';
import { ProfitabilityAnalysis } from '../../../core/models/Profitability/ProfitabilityAnalysis';
import { ProfitabilityResponse } from '../../../core/models/Profitability/ProfitabilityResponse';
import { ProfitabilityStats } from '../../../core/models/Profitability/ProfitabilityStats';

@Component({
  selector: 'app-expenses-profitability',
  imports: [RouterLink, CommonModule],
  templateUrl: './expenses-profitability.component.html',
  styleUrl: './expenses-profitability.component.scss'
})
export class ExpensesProfitabilityComponent implements OnInit, OnDestroy {
  users: Users[] = [];
  displayedUsers: Users[] = [];
  currentUser: Users | null = null;
  user: Users | null = null;
  isSidebarCollapsed = false;

  // Données de rentabilité
  profitabilityData: ProfitabilityResponse | null = null;
  monthComparison: any = null;
  isLoading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService,
    private router: Router,
    private authService: AuthService,
    private profitabilityService: ProfitabilityService
  ) {}

  ngOnInit(): void {
    this.getUsers();
    this.loadCurrentUser();
    this.loadCurrentMonthProfitability();
    this.loadMonthComparison();

    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charger les données de rentabilité du mois en cours
   */
  loadCurrentMonthProfitability(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.profitabilityService.getCurrentMonthProfitability()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.profitabilityData = response;
          this.isLoading = false;
          console.log('Données de rentabilité chargées avec succès:', response);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des données de rentabilité:', error);
          this.errorMessage = error.message || 'Erreur lors du chargement des données';
          this.isLoading = false;
        }
      });
  }

  /**
   * Charger la comparaison mensuelle
   */
  loadMonthComparison(): void {
    this.profitabilityService.compareMonths()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (comparison) => {
          this.monthComparison = comparison;
          console.log('Comparaison mensuelle chargée:', comparison);
        },
        error: (error) => {
          console.error('Erreur lors du chargement de la comparaison:', error);
        }
      });
  }

  /**
   * Charger les données pour une période spécifique
   */
  loadProfitabilityForPeriod(startDate: Date, endDate: Date, centreId?: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    const request = this.profitabilityService.createCustomPeriodRequest(startDate, endDate, centreId);

    this.profitabilityService.getProfitabilityAnalysis(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.profitabilityData = response;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des données de rentabilité:', error);
          this.errorMessage = error.message || 'Erreur lors du chargement des données';
          this.isLoading = false;
        }
      });
  }

  /**
   * Charger les données pour un centre spécifique
   */
  loadProfitabilityByCentre(centreId: string, startDate: Date, endDate: Date): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.profitabilityService.getProfitabilityByCentre(centreId, startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.profitabilityData = response;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des données du centre:', error);
          this.errorMessage = error.message || 'Erreur lors du chargement des données du centre';
          this.isLoading = false;
        }
      });
  }

  /**
   * Exporter les données en Excel
   */
  exportToExcel(): void {
    if (!this.profitabilityData) {
      this.errorMessage = 'Aucune donnée à exporter';
      return;
    }

    const request = this.profitabilityService.createCurrentMonthRequest();

    this.profitabilityService.exportToExcel(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const fileName = `Rentabilite_${this.formatDateForFilename(request.startDate)}_${this.formatDateForFilename(request.endDate)}.xlsx`;
          this.profitabilityService.downloadExcel(blob, fileName);
        },
        error: (error) => {
          console.error('Erreur lors de l\'export Excel:', error);
          this.errorMessage = error.message || 'Erreur lors de l\'export des données';
        }
      });
  }

  /**
   * Rafraîchir les données
   */
  refreshData(): void {
    this.loadCurrentMonthProfitability();
    this.loadMonthComparison();
  }

  /**
   * Obtenir les statistiques globales
   */
  getGlobalStats(): ProfitabilityStats | null {
    return this.profitabilityData?.globalStats || null;
  }

  /**
   * Obtenir les détails par centre
   */
  getCentreDetails(): ProfitabilityAnalysis[] {
    return this.profitabilityData?.centreDetails || [];
  }

  /**
   * Formater un montant en devise
   */
  formatCurrency(amount: number): string {
    return `${amount?.toLocaleString('fr-FR') || '0'} FCFA`;
  }

  /**
   * Formater un pourcentage
   */
  formatPercentage(value: number): string {
    return `${value?.toFixed(1) || '0.0'}%`;
  }

  /**
   * Vérifier si une valeur est positive
   */
  isPositive(value: number): boolean {
    return value > 0;
  }

  /**
   * Obtenir la variation formatée pour l'affichage
   */
  getChangeDisplay(change: number, percent: number): string {
    const sign = change > 0 ? '+' : '';
    return `${sign}${this.formatCurrency(change)} (${sign}${percent?.toFixed(1) || '0.0'}%)`;
  }

  /**
   * Formater une date pour le nom de fichier
   */
  private formatDateForFilename(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  // Les méthodes existantes restent inchangées...
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

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    if (sidebar && mainContent) {
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('collapsed');
    }
  }

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
}

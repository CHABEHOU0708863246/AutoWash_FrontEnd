import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { Users } from '../../../core/models/Users/Users';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { AttendancesService } from '../../../core/services/Attendances/attendances.service';
import { DailyAttendanceRequest } from '../../../core/models/Attendances/DailyAttendanceRequest';
import { AttendanceRecord } from '../../../core/models/Attendances/AttendanceRecord';
import { FormsModule } from '@angular/forms';
import { RolesService } from '../../../core/services/Roles/roles.service';
import { NotificationService } from '../../../core/services/Notification/notification.service';

// Interface pour les données de présence temporaires
interface WasherAttendance {
  user: Users;
  isPresent: boolean;
  arrivalTime: string;
  departureTime: string;
  notes: string;
  isSelected: boolean;
}

@Component({
  selector: 'app-washers-attendance',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './washers-attendance.component.html',
  styleUrl: './washers-attendance.component.scss',
})
export class WashersAttendanceComponent implements OnInit {
  // Données utilisateurs
  users: Users[] = [];
  currentUser: Users | null = null;

  // Données de présence
  washerAttendances: WasherAttendance[] = [];
  selectedWashers: WasherAttendance[] = [];

  // Filtres et recherche
  searchTerm: string = '';
  selectedCentreId: string = '';

  // Statistiques
  totalWashers: number = 0;
  presentCount: number = 0;
  absentCount: number = 0;
  attendanceRate: number = 0;

  // État de l'application
  isLoading: boolean = true;
  isSaving: boolean = false;
  currentDate: Date = new Date();

  // Horaires par défaut
  readonly DEFAULT_START_TIME = '08:00';
  readonly DEFAULT_END_TIME = '17:00';

  // Cache des noms de rôles pour éviter les appels répétés
  private roleNamesCache: Map<string, string> = new Map();

  constructor(
    private sanitizer: DomSanitizer,
    private router: Router,
    private usersService: UsersService,
    private authService: AuthService,
    private attendanceService: AttendancesService,
    private rolesService: RolesService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
  }

  /**
   * Initialisation centralisée du composant
   */
  private initializeComponent(): void {
    this.isLoading = true;

    // Précharger les rôles avant tout
    this.rolesService.loadRoles().then(() => {
      this.loadCurrentUserAndWashers().subscribe({
        next: () => {
          this.isLoading = false;
          this.initializeAttendanceData();
          this.updateStatistics();
        },
        error: (error: any) => {
          console.error("Erreur lors de l'initialisation du composant", error);
          this.isLoading = false;
        },
      });
    }).catch(error => {
      console.error('Erreur lors du préchargement des rôles', error);
      this.isLoading = false;
    });
  }

  /**
   * Charge l'utilisateur courant puis ses washers
   */
  private loadCurrentUserAndWashers(): Observable<any> {
    return this.loadCurrentUser().pipe(
      switchMap((user: Users | null) => this.getManagerWashers())
    );
  }

  /**
   * Charge l'utilisateur courant
   */
  private loadCurrentUser(): Observable<Users | null> {
    return this.authService.loadCurrentUserProfile().pipe(
      catchError((error: any) => {
        console.error('Erreur AuthService, fallback vers UsersService', error);
        return this.usersService.getCurrentUser();
      }),
      switchMap((user: Users | null) => {
        if (user) {
          this.currentUser = user;
          this.selectedCentreId = user.centreId || '';
          return this.loadCurrentUserPhoto().pipe(switchMap(() => of(user)));
        }
        return of(null);
      }),
      catchError((error: any) => {
        console.error(
          "Erreur critique lors du chargement de l'utilisateur",
          error
        );
        return of(null);
      })
    );
  }

  /**
   * Charge la photo de l'utilisateur courant
   */
  private loadCurrentUserPhoto(): Observable<void> {
    return new Observable((observer) => {
      if (!this.currentUser) {
        observer.next();
        observer.complete();
        return;
      }

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
              observer.next();
              observer.complete();
            };
            reader.readAsDataURL(blob);
          },
          error: (error) => {
            console.error(
              'Erreur lors du chargement de la photo utilisateur',
              error
            );
            this.setDefaultUserPhoto();
            observer.next();
            observer.complete();
          },
        });
      } else {
        this.setDefaultUserPhoto();
        observer.next();
        observer.complete();
      }
    });
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
   * Récupère les washers du manager
   * CORRECTION PRINCIPALE : Logique identique à washers-list
   */
  private getManagerWashers(): Observable<Users[]> {
    return new Observable((observer) => {
      // Vérifier que l'utilisateur est bien un manager
      this.isManagerAsync().then(isManager => {
        if (!isManager) {
          console.warn("L'utilisateur n'est pas un manager, accès refusé");
          this.users = [];
          observer.next([]);
          observer.complete();
          return;
        }

        const managerCentreId = this.currentUser?.centreId;
        console.log('Centre du manager:', managerCentreId);

        this.usersService.getAllUsers().subscribe({
          next: async (allUsers: Users[]) => {
            console.log('Tous les utilisateurs récupérés:', allUsers.length);

            // Filtrer les washers de manière asynchrone
            const filteredUsers: Users[] = [];

            for (const user of allUsers) {
              const isWasher = await this.isUserWasherAsync(user);

              if (!managerCentreId) {
                // Manager global : tous les washers
                if (isWasher) {
                  filteredUsers.push(user);
                }
              } else {
                // Manager de centre : washers du même centre
                if (isWasher && user.centreId === managerCentreId) {
                  filteredUsers.push(user);
                }
              }
            }

            this.users = filteredUsers;
            console.log('Washers filtrés:', this.users.length);

            // Charger les photos
            this.loadAllWashersPhotos().subscribe({
              next: () => {
                observer.next(this.users);
                observer.complete();
              },
              error: (error) => {
                console.error('Erreur chargement photos', error);
                observer.next(this.users);
                observer.complete();
              }
            });
          },
          error: (error: any) => {
            console.error('Erreur lors de la récupération des washers', error);
            this.users = [];
            observer.error(error);
          }
        });
      }).catch(error => {
        console.error('Erreur vérification rôle manager', error);
        this.users = [];
        observer.error(error);
      });
    });
  }

  private extractRoleIds(user: any): string[] {
  if (!user.roles || !Array.isArray(user.roles)) {
    console.log('❌ Aucun rôle ou format invalide');
    return [];
  }

  console.log('🔍 DEBUG extractRoleIds - Rôles bruts:', user.roles);

  const roleIds: string[] = [];

  for (const role of user.roles) {
    console.log('🔍 DEBUG - Analyse rôle:', role, 'Type:', typeof role);

    if (typeof role === 'string') {
      // C'est déjà un ID string
      console.log(`   ✅ ID string détecté: ${role}`);
      roleIds.push(role);
    } else if (typeof role === 'object' && role !== null) {
      // C'est un objet rôle - extraire l'ID
      const id = role.id || role._id || role.roleId;
      if (id) {
        const idString = id.toString();
        console.log(`   ✅ ID objet détecté: ${idString}`, role);
        roleIds.push(idString);
      } else {
        console.log('   ❌ Objet rôle sans ID:', role);
      }
    } else {
      console.log('   ❌ Format de rôle inattendu:', role);
    }
  }

  console.log('🔍 DEBUG - IDs extraits finaux:', roleIds);
  return roleIds;
}


  /**
   * Vérifie si l'utilisateur a le rôle washer (VERSION ASYNC)
   */
private async isUserWasherAsync(user: Users): Promise<boolean> {
  if (!user.roles || user.roles.length === 0) {
    console.log('      ⚠️ Pas de rôles');
    return false;
  }

  console.log('      🔍 DEBUG isUserWasherAsync - Rôles bruts:', user.roles);

  // Extraire les IDs/codes
  const rolesData = this.extractRoleIds(user);
  console.log('      🔍 DEBUG - IDs/codes extraits:', rolesData);

  if (rolesData.length === 0) {
    console.log('      ❌ Aucun ID/code valide extrait');
    return false;
  }

  try {
    // STRATÉGIE 1 : Vérifier si ce sont des codes directs (admin, manager, washer...)
    const washerCodes = ['washer', 'Washer', 'WASHER', 'laveur', 'Laveur', 'LAVEUR'];

    for (const roleData of rolesData) {
      const roleStr = roleData.toLowerCase();
      if (washerCodes.some(code => code.toLowerCase() === roleStr)) {
        console.log(`      ✅ Washer détecté via code direct: ${roleData}`);
        return true;
      }
    }

    // STRATÉGIE 2 : Ce sont peut-être des IDs MongoDB - utiliser le service
    console.log('      🔍 Vérification via service des rôles...');
    for (const code of washerCodes) {
      const hasRole = await this.rolesService.hasRole(rolesData, code);
      console.log(`         hasRole("${code}"): ${hasRole}`);
      if (hasRole) {
        console.log(`      ✅ Washer détecté via service: ${code}`);
        return true;
      }
    }

    // STRATÉGIE 3 : Fallback via les noms de rôles
    console.log('      🔍 Fallback: vérification via noms de rôles...');
    const roleNames = await this.rolesService.getRoleNames(rolesData);
    console.log('      📋 Noms des rôles:', roleNames);

    const isWasher = roleNames.some(name =>
      name && (name.toLowerCase().includes('washer') ||
      name.toLowerCase().includes('laveur'))
    );

    if (isWasher) {
      console.log('      ✅ Washer détecté via nom de rôle');
    } else {
      console.log('      ❌ Pas un washer');
    }

    return isWasher;
  } catch (error) {
    console.error('      💥 Erreur vérification rôle washer:', error);
    return false;
  }
}

  /**
   * Vérifie si l'utilisateur connecté est un manager (VERSION ASYNC)
   */
  private async isManagerAsync(): Promise<boolean> {
    if (!this.currentUser || !this.currentUser.roles || this.currentUser.roles.length === 0) {
      console.warn('❌ Pas de currentUser ou pas de roles');
      return false;
    }

    console.log('🔍 Vérification rôle manager pour:', this.currentUser);
    console.log('📋 Roles IDs:', this.currentUser.roles);

    try {
      // Essayer plusieurs codes possibles
      const roleCodes = ['manager', 'Manager', 'MANAGER', 'gerant', 'gérant', 'Gérant'];

      for (const code of roleCodes) {
        const hasRole = await this.rolesService.hasRole(this.currentUser.roles, code);
        console.log(`🔍 hasRole("${code}"):`, hasRole);

        if (hasRole) {
          console.log(`✅ Utilisateur identifié comme manager via code: ${code}`);
          return true;
        }
      }

      // Si aucun code ne marche, afficher les rôles disponibles
      console.warn('❌ Aucun code manager trouvé. Vérification des noms de rôles...');
      const roleNames = await this.rolesService.getRoleNames(this.currentUser.roles);
      console.log('📋 Noms des rôles de l\'utilisateur:', roleNames);

      // Vérifier si un des noms contient "manager" ou "gérant"
      const isManager = roleNames.some(name =>
        name.toLowerCase().includes('manager') ||
        name.toLowerCase().includes('gérant')
      );

      if (isManager) {
        console.log('✅ Utilisateur identifié comme manager via nom de rôle');
      } else {
        console.error('❌ L\'utilisateur n\'a pas de rôle manager. Rôles actuels:', roleNames);
      }

      return isManager;
    } catch (error) {
      console.error('💥 Erreur vérification rôle manager:', error);
      return false;
    }
  }

  /**
   * Vérifie si l'utilisateur est un washer du centre du manager
   */
  private isWasherFromManagerCentre(
    user: Users,
    managerCentreId: string
  ): boolean {
    const isWasher = this.isUserWasher(user);
    const sameCentre = user.centreId === managerCentreId;
    return isWasher && sameCentre;
  }

  /**
   * Vérifie si l'utilisateur a le rôle washer
   */
  private isUserWasher(user: Users): boolean {
    if (!user.roles || user.roles.length === 0) {
      return false;
    }
    const userRole = this.getUserRoleName(user).toLowerCase();
    return userRole === 'washer' || userRole === 'laveur';
  }

  /**
   * Vérifie si l'utilisateur connecté est un manager
   */
  private isManager(): boolean {
    if (!this.currentUser) return false;
    const userRole = this.getUserRoleName(this.currentUser).toLowerCase();
    console.log(
      'Rôle détecté:',
      userRole,
      "pour l'utilisateur:",
      this.currentUser
    );
    return userRole === 'manager' || userRole === 'gérant';
  }

  /**
   * Charge les photos de tous les washers
   */
  private loadAllWashersPhotos(): Observable<any[]> {
    if (this.users.length === 0) {
      return of([]);
    }

    const photoRequests = this.users
      .filter((user) => user.photoUrl && typeof user.photoUrl === 'string')
      .map((user) =>
        this.usersService.getUserPhoto(user.photoUrl as string).pipe(
          catchError((error: any) => {
            console.error(`Erreur photo pour ${user.firstName}`, error);
            return of(null);
          })
        )
      );

    if (photoRequests.length === 0) {
      return of([]);
    }

    return forkJoin(photoRequests).pipe(
      switchMap((blobs: (Blob | null)[]) => {
        blobs.forEach((blob, index) => {
          if (blob) {
            this.loadUserPhotoSafeUrl(this.users[index], blob);
          }
        });
        return of(blobs);
      })
    );
  }

  /**
   * Charge une photo utilisateur de manière sécurisée
   */
  private loadUserPhotoSafeUrl(user: Users, blob: Blob): void {
    const reader = new FileReader();
    reader.onload = () => {
      user.photoSafeUrl = this.sanitizer.bypassSecurityTrustUrl(
        reader.result as string
      );
    };
    reader.readAsDataURL(blob);
  }

  /**
   * Met à jour les données de présence avec les données sauvegardées
   */
  private initializeAttendanceData(): void {
    const savedData = this.loadAttendanceDataFromStorage();

    if (savedData && this.users.length > 0) {
      // Reconstruire les données à partir du storage
      this.washerAttendances = this.users.map((user) => {
        const savedAttendance = savedData.find((sa) => sa.user);

        if (savedAttendance) {
          return {
            user: user,
            isPresent: savedAttendance.isPresent,
            arrivalTime: savedAttendance.arrivalTime,
            departureTime: savedAttendance.departureTime,
            notes: savedAttendance.notes || '',
            isSelected: savedAttendance.isSelected,
          };
        } else {
          // Données par défaut si pas de sauvegarde pour cet utilisateur
          return this.createDefaultAttendance(user);
        }
      });
    } else {
      // Données par défaut si pas de sauvegarde
      this.washerAttendances = this.users.map((user) =>
        this.createDefaultAttendance(user)
      );
    }
  }

  /**
   * Met à jour les statistiques
   */
  private updateStatistics(): void {
    this.totalWashers = this.washerAttendances.length;
    this.presentCount = this.washerAttendances.filter(
      (wa) => wa.isPresent
    ).length;
    this.absentCount = this.totalWashers - this.presentCount;
    this.attendanceRate =
      this.totalWashers > 0
        ? Math.round((this.presentCount / this.totalWashers) * 100)
        : 0;

    this.updateSelectedWashers();
  }

  /**
   * Met à jour la liste des washers sélectionnés
   */
  private updateSelectedWashers(): void {
    this.selectedWashers = this.washerAttendances.filter((wa) => wa.isSelected);
  }

  //#region MÉTHODES PUBLIQUES - GESTION DES PRÉSENCES

  /**
   * Bascule l'état de présence d'un washer
   */
  togglePresence(washer: WasherAttendance): void {
    washer.isPresent = !washer.isPresent;
    if (!washer.isPresent) {
      washer.arrivalTime = '';
      washer.departureTime = '';
    } else {
      washer.arrivalTime = this.DEFAULT_START_TIME;
      washer.departureTime = this.DEFAULT_END_TIME;
    }
    this.updateStatistics();
    this.saveAttendanceDataToStorage(); // ← AJOUT
  }

  /**
   * Met à jour les notes et sauvegarde
   */
  updateNotes(washer: WasherAttendance, notes: string): void {
    washer.notes = notes;
    this.saveAttendanceDataToStorage(); // ← AJOUT
  }

  /**
   * Met à jour l'heure d'arrivée et sauvegarde
   */
  updateArrivalTime(washer: WasherAttendance, time: string): void {
    washer.arrivalTime = time;
    this.saveAttendanceDataToStorage(); // ← AJOUT
  }

  /**
   * Met à jour l'heure de départ et sauvegarde
   */
  updateDepartureTime(washer: WasherAttendance, time: string): void {
    washer.departureTime = time;
    this.saveAttendanceDataToStorage(); // ← AJOUT
  }

  /**
   * Sélectionne/désélectionne tous les washers
   */
  selectAllWashers(): void {
    this.washerAttendances.forEach((washer) => {
      washer.isSelected = true;
    });
    this.updateStatistics();
  }

  /**
   * Désélectionne tous les washers
   */
  deselectAllWashers(): void {
    this.washerAttendances.forEach((washer) => {
      washer.isSelected = false;
    });
    this.updateStatistics();
  }

  /**
   * Bascule la sélection d'un washer
   */
  toggleWasherSelection(washer: WasherAttendance): void {
    washer.isSelected = !washer.isSelected;
    this.updateStatistics();
    this.saveAttendanceDataToStorage(); // ← AJOUT
  }

  /**
   * Filtre les washers selon le terme de recherche
   */
  filterWashers(): void {
    // Implémentation de la recherche si nécessaire
    this.updateStatistics();
  }

  /**
   * Enregistre les présences en base de données
   */
  /**
   * Enregistre les présences en base de données
   */
  saveAttendances(): void {
    if (!this.currentUser?.centreId) {
      this.notificationService.error(
        'Erreur',
        'Centre ID manquant. Impossible d\'enregistrer les présences.'
      );
      return;
    }

    // Vérifier s'il y a des washers à enregistrer
    if (this.washerAttendances.length === 0) {
      this.notificationService.warning(
        'Aucun washer',
        'Aucun washer trouvé pour enregistrer les présences.'
      );
      return;
    }

    this.isSaving = true;

    const request = new DailyAttendanceRequest(
      this.currentUser.centreId,
      this.currentDate,
      this.washerAttendances.map((wa) => ({
        userId: wa.user.id,
        isPresent: wa.isPresent,
        checkInTime: wa.isPresent
          ? this.convertTimeToDate(wa.arrivalTime)
          : undefined,
        checkOutTime: wa.isPresent
          ? this.convertTimeToDate(wa.departureTime)
          : undefined,
        notes: wa.notes || '',
      })),
      this.currentUser.id
    );

    console.log('Données envoyées:', request);

    this.attendanceService.markAttendance(request).subscribe({
      next: (resp) => {
        console.log('Présences enregistrées', resp);

        // Remplacer le console.log par une notification de succès
        this.notificationService.success(
          'Succès',
          `Présences enregistrées avec succès pour ${this.presentCount} washer(s) présent(s) et ${this.absentCount} absent(s).`
        );

        this.isSaving = false;
        this.clearAttendanceStorage();
      },
      error: (err) => {
        console.error('Erreur enregistrement', err);

        // Remplacer le console.error par une notification d'erreur
        this.notificationService.error(
          'Erreur',
          `Erreur lors de l'enregistrement des présences: ${err.message || 'Veuillez réessayer'}`
        );

        this.isSaving = false;
      },
    });
  }

  /**
   * Convertit une heure au format "HH:mm" en objet Date
   * @param timeString Format "08:00" ou "17:30"
   * @returns Date avec l'heure spécifiée pour aujourd'hui
   */
  private convertTimeToDate(timeString: string): Date | undefined {
    if (!timeString || timeString.trim() === '') {
      return undefined;
    }

    try {
      const [hours, minutes] = timeString.split(':').map(Number);

      // Utiliser la date actuelle avec l'heure spécifiée
      const date = new Date(this.currentDate);
      date.setHours(hours, minutes, 0, 0);

      return date;
    } catch (error) {
      console.error('Erreur conversion heure:', timeString, error);
      return undefined;
    }
  }

  /**
   * Exporte les présences en Excel
   */
  exportToExcel(): void {
    if (!this.currentUser?.centreId) {
      this.notificationService.error(
        'Erreur',
        'Centre ID manquant. Impossible d\'exporter le rapport.'
      );
      return;
    }

    this.attendanceService
      .generateWeeklyReport(this.currentUser.centreId, this.currentDate)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.attendanceService.downloadFile(
              response.data,
              `presences-${this.formatDateForExport(this.currentDate)}.xlsx`
            );

            // Notification de succès pour l'export
            this.notificationService.success(
              'Export réussi',
              'Le rapport des présences a été exporté avec succès.'
            );
          } else {
            this.notificationService.warning(
              'Export incomplet',
              'Aucune donnée à exporter pour la période sélectionnée.'
            );
          }
        },
        error: (error) => {
          console.error("Erreur lors de l'export", error);

          this.notificationService.error(
            'Erreur d\'export',
            `Erreur lors de l'export du rapport: ${error.message || 'Veuillez réessayer'}`
          );
        },
      });
  }

  //#endregion

  //#region MÉTHODES UTILITAIRES

  /**
   * Retourne le nom complet de l'utilisateur connecté
   */
  getFullName(): string {
    if (this.currentUser) {
      const firstName = this.currentUser.firstName || '';
      const lastName = this.currentUser.lastName || '';
      return `${firstName} ${lastName}`.trim() || 'Manager';
    }
    return 'Manager';
  }

  /**
   * Retourne le rôle de l'utilisateur connecté
   */
  getUserRole(): string {
    if (!this.currentUser) return 'Rôle non défini';
    return this.getUserRoleName(this.currentUser);
  }

  /**
   * Retourne le nom du rôle d'un utilisateur
   */
  private getUserRoleName(user: Users): string {
    if (user.roles && user.roles.length > 0) {
      return this.mapRoleIdToName(user.roles[0]);
    }
    return 'Rôle inconnu';
  }

  private mapRoleIdToName(roleId: any): string {
    let roleString: string;

    if (typeof roleId === 'string') {
      roleString = roleId;
    } else if (roleId && typeof roleId === 'object' && roleId.$oid) {
      roleString = roleId.$oid;
    } else {
      return 'Rôle inconnu';
    }

    const roleMapping: { [key: string]: string } = {
      // IDs de rôles (à adapter selon votre base de données)
      '68d92acc0838460ccb3fa6d8': 'Manager',
      '68d92acc0838460ccb3fa6d7': 'Administrateur',
      '68d92acc0838460ccb3fa6d9': 'Washer',

      // Noms de rôles normalisés
      admin: 'Administrateur',
      administrateur: 'Administrateur',
      manager: 'Manager',
      gérant: 'Manager',
      washer: 'Washer',
      laveur: 'Washer',
      editor: 'Éditeur',
      éditeur: 'Éditeur',

      // IDs numériques (si utilisés)
      '1': 'Administrateur',
      '2': 'Manager',
      '3': 'Éditeur',
      '4': 'Washer',
    };

    return (
      roleMapping[roleString] ||
      roleMapping[roleString.toLowerCase()] ||
      roleString
    );
  }

  /**
   * Formate la date pour l'affichage
   */
  getFormattedDate(): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return this.currentDate.toLocaleDateString('fr-FR', options);
  }

  /**
   * Formate la date pour l'export
   */
  private formatDateForExport(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Affiche une notification
   */
  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): void {
    const title = type === 'success' ? 'Succès' :
                 type === 'error' ? 'Erreur' :
                 type === 'warning' ? 'Attention' : 'Information';

    switch (type) {
      case 'success':
        this.notificationService.success(title, message);
        break;
      case 'error':
        this.notificationService.error(title, message);
        break;
      case 'warning':
        this.notificationService.warning(title, message);
        break;
      case 'info':
        this.notificationService.info(title, message);
        break;
    }
  }

  /**
   * Calcule les heures travaillées
   */
  calculateWorkedHours(arrivalTime: string, departureTime: string): string {
    if (!arrivalTime || !departureTime) return '0h';

    const [arrivalHours, arrivalMinutes] = arrivalTime.split(':').map(Number);
    const [departureHours, departureMinutes] = departureTime
      .split(':')
      .map(Number);

    const totalMinutes =
      departureHours * 60 +
      departureMinutes -
      (arrivalHours * 60 + arrivalMinutes);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h${minutes > 0 ? `${minutes}min` : ''}`;
  }

  /**
   * Calcule le retard
   */
  calculateDelay(arrivalTime: string): string {
    if (!arrivalTime) return '0min';

    const [arrivalHours, arrivalMinutes] = arrivalTime.split(':').map(Number);
    const [defaultHours, defaultMinutes] =
      this.DEFAULT_START_TIME.split(':').map(Number);

    const totalMinutes =
      arrivalHours * 60 + arrivalMinutes - (defaultHours * 60 + defaultMinutes);

    if (totalMinutes <= 0) return '0min';
    return `${totalMinutes}min`;
  }

  /**
   * Déconnecte l'utilisateur
   */
  logout(): void {
    if (this.authService.isAuthenticated()) {
      try {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
      } catch (error: any) {
        console.error('Erreur lors de la déconnexion:', error);
        this.router.navigate(['/auth/login']);
      }
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  //#endregion

  //#region

  /**
   * Clé pour le stockage local des présences
   */
  private readonly STORAGE_KEY = 'washer_attendances_data';

  /**
   * Sauvegarde les données de présence dans le localStorage
   */
  private saveAttendanceDataToStorage(): void {
    try {
      const dataToSave = {
        attendances: this.washerAttendances.map((wa) => ({
          userId: wa.user.id,
          isPresent: wa.isPresent,
          arrivalTime: wa.arrivalTime,
          departureTime: wa.departureTime,
          notes: wa.notes,
          isSelected: wa.isSelected,
        })),
        date: this.currentDate.toISOString(),
        centreId: this.currentUser?.centreId,
        timestamp: new Date().getTime(),
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Erreur sauvegarde localStorage:', error);
    }
  }

  /**
   * Récupère les données de présence depuis le localStorage
   */
  private loadAttendanceDataFromStorage(): WasherAttendance[] | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored);

      // Vérifier si les données sont encore valides (même jour et même centre)
      const storedDate = new Date(data.date);
      const isSameDay = this.isSameDay(storedDate, this.currentDate);
      const isSameCentre = data.centreId === this.currentUser?.centreId;

      if (!isSameDay || !isSameCentre) {
        this.clearAttendanceStorage(); // Nettoyer si obsolète
        return null;
      }

      // Vérifier si les données ne sont pas trop vieilles (24h max)
      const now = new Date().getTime();
      if (now - data.timestamp > 24 * 60 * 60 * 1000) {
        this.clearAttendanceStorage();
        return null;
      }

      return data.attendances;
    } catch (error) {
      console.error('Erreur lecture localStorage:', error);
      this.clearAttendanceStorage();
      return null;
    }
  }

  /**
   * Vérifie si deux dates sont le même jour
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  /**
   * Nettoie le storage
   */
  private clearAttendanceStorage(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Crée une entrée de présence par défaut
   */
  private createDefaultAttendance(user: Users): WasherAttendance {
    return {
      user: user,
      isPresent: false,
      arrivalTime: this.DEFAULT_START_TIME,
      departureTime: this.DEFAULT_END_TIME,
      notes: '',
      isSelected: false,
    };
  }

  //#endregion
}

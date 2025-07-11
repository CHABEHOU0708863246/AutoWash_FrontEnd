import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { DaySchedule } from '../../../core/models/Settings/DaySchedule';
import { CommonModule, Time } from '@angular/common';
import { DayOfWeek } from '../../../core/models/Settings/DayOfWeek';
import { ScheduleSettings } from '../../../core/models/Settings/ScheduleSettings';
import { SettingsService } from '../../../core/services/Settings/settings.service';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { DomSanitizer } from '@angular/platform-browser';
import { Users } from '../../../core/models/Users/Users';

@Component({
  selector: 'app-settings-schedule',
  imports: [RouterLink, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './settings-schedule.component.html',
  styleUrl: './settings-schedule.component.scss',
})
export class SettingsScheduleComponent implements OnInit {
  //#region Propriétés du composant
  scheduleForm!: FormGroup;
  showPreview: boolean = false;
  weekDays: DaySchedule[] = [];
  isLoading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  currentSchedule?: ScheduleSettings;


  users: Users[] = [];
  displayedUsers: Users[] = [];
  currentUser: Users | null = null;
  user: Users | null = null;
  centreId: string = '';

  isAdmin: boolean = false;
  selectedCentreId: string = '';
  availableCentres: any[] = [];
  showCentreSelector: boolean = false;
  loadCurrentUserAndCentre: any;
  //#endregion

  //#region Constructeur et Initialisation
  constructor(
    private sanitizer: DomSanitizer,
    private formBuilder: FormBuilder,
    private router: Router,
    private usersService: UsersService,
    private settingsService: SettingsService,
    private centresService: CentresService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadUserData();
    this.getUsers();
    this.loadCurrentUser();
  }

  initForm(): void {
    this.scheduleForm = this.formBuilder.group({
      // Configuration des jours
      mondayEnabled: [true],
      mondayStart: ['08:00', [Validators.required, this.timeValidator]],
      mondayEnd: [
        '18:00',
        [
          Validators.required,
          this.timeValidator,
          this.endTimeValidator('mondayStart'),
        ],
      ],

      tuesdayEnabled: [true],
      tuesdayStart: ['08:00', [Validators.required, this.timeValidator]],
      tuesdayEnd: [
        '18:00',
        [
          Validators.required,
          this.timeValidator,
          this.endTimeValidator('tuesdayStart'),
        ],
      ],

      wednesdayEnabled: [true],
      wednesdayStart: ['08:00', [Validators.required, this.timeValidator]],
      wednesdayEnd: [
        '18:00',
        [
          Validators.required,
          this.timeValidator,
          this.endTimeValidator('wednesdayStart'),
        ],
      ],

      thursdayEnabled: [true],
      thursdayStart: ['08:00', [Validators.required, this.timeValidator]],
      thursdayEnd: [
        '18:00',
        [
          Validators.required,
          this.timeValidator,
          this.endTimeValidator('thursdayStart'),
        ],
      ],

      fridayEnabled: [true],
      fridayStart: ['08:00', [Validators.required, this.timeValidator]],
      fridayEnd: [
        '18:00',
        [
          Validators.required,
          this.timeValidator,
          this.endTimeValidator('fridayStart'),
        ],
      ],

      saturdayEnabled: [false],
      saturdayStart: ['09:00', [Validators.required, this.timeValidator]],
      saturdayEnd: [
        '17:00',
        [
          Validators.required,
          this.timeValidator,
          this.endTimeValidator('saturdayStart'),
        ],
      ],

      sundayEnabled: [false],
      sundayStart: ['09:00', [Validators.required, this.timeValidator]],
      sundayEnd: [
        '17:00',
        [
          Validators.required,
          this.timeValidator,
          this.endTimeValidator('sundayStart'),
        ],
      ],

      // Paramètres généraux
      timezone: ['Europe/Paris', Validators.required],
      defaultBreakDuration: [30, [Validators.min(0), Validators.max(480)]],
      overtimeThreshold: [40, [Validators.min(1), Validators.max(80)]],
      notificationsEnabled: [true],
      arrivalTolerance: [15, [Validators.min(0), Validators.max(60)]],
      weekStartDay: ['monday'],
      is24Hours: [false],
    });
  }

  /**
   * Charge les données utilisateur et initialise le composant
   */
  loadUserData(): void {
    this.authService.loadCurrentUserProfile().subscribe({
      next: (user) => {
        if (user) {
          this.currentUser = user;
          this.checkUserRole(user);
          this.handleUserBasedOnRole(user);
        }
      },
      error: (err) => {
        console.error('❌ Erreur rechargement profil:', err);
        this.loadCurrentUserAndCentre();
      },
    });
  }

  /**
   * Abonne le composant aux changements de l'utilisateur
   */
  subscribeToUserChanges(): void {
    this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
        this.user = user;
        this.checkUserRole(user);
        this.handleUserBasedOnRole(user);
      }
    });
  }
  //#endregion

  //#region Gestion des Utilisateurs
  /**
   * Récupère tous les utilisateurs et charge leurs photos
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
   * Charge l'utilisateur actuellement connecté
   */
loadCurrentUser(): void {
  this.authService.currentUser$.subscribe({
    next: (user) => {
      if (user) {
        this.currentUser = user;
        this.user = user;
        this.checkUserRole(user);
        this.handleUserBasedOnRole(user);
        // Charger les paramètres après avoir déterminé le rôle et le centre
        this.loadScheduleSettings();
      }
    },
    error: (err) => {
      console.error('❌ Erreur lors du chargement utilisateur:', err);
      this.errorMessage = 'Erreur lors du chargement des données utilisateur';
    }
  });
}

  /**
   * Méthode de secours pour charger l'utilisateur via UsersService
   */
  fallbackToUsersService(): void {
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

  /**
   * Charge la photo de l'utilisateur actuel
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
   * Définit une photo par défaut pour l'utilisateur
   */
  setDefaultUserPhoto(): void {
    this.currentUser!.photoSafeUrl = this.sanitizer.bypassSecurityTrustUrl(
      'assets/images/default-avatar.png'
    );
  }

  /**
   * Charge les photos des utilisateurs affichés
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
  //#endregion

  //#region Gestion des Rôles et Centres
  /**
   * Vérifie le rôle de l'utilisateur
   * @param user L'utilisateur à vérifier
   */
  checkUserRole(user: Users): void {
    this.isAdmin =
      user.roles?.some(
        (role) =>
          role.toLowerCase().includes('admin') ||
          role.toLowerCase().includes('administrator')
      ) || false;
  }

  /**
 * Méthode appelée lors du changement de centre (pour les admins)
 */
onCentreChange(): void {
  this.centreId = this.selectedCentreId;
  this.loadScheduleSettings();
}

  /**
   * Gère le comportement en fonction du rôle de l'utilisateur
   * @param user L'utilisateur connecté
   */
  handleUserBasedOnRole(user: Users): void {
  if (this.isAdmin) {
    this.handleAdminUser();
  } else if (user.centreId) {
    this.centreId = user.centreId;
    this.showCentreSelector = false; // Pas de sélecteur pour les utilisateurs normaux
  } else {
    this.handleUserWithoutCentre();
  }
}

  /**
   * Gère le cas d'un utilisateur administrateur
   */
  handleAdminUser(): void {
    console.log('👑 Utilisateur administrateur détecté');
    this.showCentreSelector = true;
    this.loadAvailableCentres();
  }

  /**
   * Gère le cas d'un utilisateur sans centre assigné
   */
  handleUserWithoutCentre(): void {
    console.warn('⚠️ Utilisateur sans centre assigné');
  }

  /**
   * Charge la liste des centres disponibles
   */
  loadAvailableCentres(): void {
    this.centresService.getAllCentres().subscribe({
      next: (centres) => {
        this.availableCentres = centres;
        console.log('🏢 Centres disponibles:', centres);
      },
      error: (err) => {
        console.error('❌ Erreur chargement centres:', err);
      },
    });
  }

  /**
   * Événement déclenché lors de la sélection d'un centre (pour les administrateurs)
   * @param centreId L'ID du centre sélectionné
   */
  onCentreSelect(centreId: string): void {
  if (this.isAdmin && centreId) {
    console.log('🏢 Centre sélectionné:', centreId);
    this.centreId = centreId;
    this.selectedCentreId = centreId;
    // Charger les paramètres pour ce centre
    this.loadScheduleSettings();
  }
}
  //#endregion

  //#region Gestion des horaires
  /**
   * Charge les horaires du centre
   */
  loadScheduleSettings(): void {
    if (!this.centreId) return;

    this.isLoading = true;
    this.settingsService.getScheduleSettings(this.centreId).subscribe({
      next: (schedule) => {
        this.currentSchedule = schedule;
        this.populateFormWithSchedule(schedule);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des horaires', err);
        this.errorMessage = 'Erreur lors du chargement des horaires';
        this.isLoading = false;
      },
    });
  }

  /**
   * Remplit le formulaire avec les horaires existants
   * @param schedule Les horaires à afficher
   */
  private populateFormWithSchedule(schedule: ScheduleSettings): void {
    const weeklySchedule = schedule.weeklySchedule;

    // Seuls les champs existants dans ScheduleSettings sont utilisés
    this.scheduleForm.patchValue({
      is24Hours: schedule.is24Hours,
      // Les autres champs sont initialisés avec des valeurs par défaut
      timezone: 'Europe/Paris', // Valeur par défaut
      defaultBreakDuration: 30, // Valeur par défaut
      overtimeThreshold: 40, // Valeur par défaut
      notificationsEnabled: true, // Valeur par défaut
      arrivalTolerance: 15, // Valeur par défaut
      weekStartDay: 'monday', // Valeur par défaut
    });

    // Remplissage des jours de la semaine
    const days = [
      { day: DayOfWeek.Monday, prefix: 'monday' },
      { day: DayOfWeek.Tuesday, prefix: 'tuesday' },
      { day: DayOfWeek.Wednesday, prefix: 'wednesday' },
      { day: DayOfWeek.Thursday, prefix: 'thursday' },
      { day: DayOfWeek.Friday, prefix: 'friday' },
      { day: DayOfWeek.Saturday, prefix: 'saturday' },
      { day: DayOfWeek.Sunday, prefix: 'sunday' },
    ];

    days.forEach(({ day, prefix }) => {
      const daySchedule = weeklySchedule.get(day); // Utilisation de .get() pour accéder à la valeur
      if (daySchedule) {
        this.scheduleForm.patchValue({
          [`${prefix}Enabled`]: daySchedule.isOpen,
          [`${prefix}Start`]: this.formatTime(daySchedule.openTime),
          [`${prefix}End`]: this.formatTime(daySchedule.closeTime),
        });
      }
    });
  }

  /**
 * Applique uniquement les jours ouvrables (lundi à vendredi)
 */
applyWeekdaysOnly(): void {
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const weekends = ['saturday', 'sunday'];

  weekdays.forEach((day) => {
    this.scheduleForm.patchValue({
      [`${day}Enabled`]: true,
      [`${day}Start`]: '09:00',
      [`${day}End`]: '17:00',
    });
  });

  weekends.forEach((day) => {
    this.scheduleForm.patchValue({
      [`${day}Enabled`]: false,
      [`${day}Start`]: '09:00',
      [`${day}End`]: '17:00',
    });
  });

  this.successMessage = 'Horaires des jours ouvrables appliqués';
  setTimeout(() => (this.successMessage = null), 3000);
}

  /**
   * Enregistre les horaires
   */
  saveSchedule(): void {
    if (this.scheduleForm.invalid || !this.centreId) {
      return;
    }

    this.isLoading = true;
    const formValue = this.scheduleForm.value;
    const scheduleSettings = this.convertFormToScheduleSettings(formValue);

    this.settingsService
      .updateScheduleSettings(this.centreId, scheduleSettings)
      .subscribe({
        next: (updatedSchedule) => {
          this.currentSchedule = updatedSchedule;
          this.successMessage = 'Horaires enregistrés avec succès';
          this.isLoading = false;
          setTimeout(() => (this.successMessage = null), 3000);
        },
        error: (err) => {
          console.error('Erreur lors de la sauvegarde des horaires', err);
          this.errorMessage = 'Erreur lors de la sauvegarde des horaires';
          this.isLoading = false;
        },
      });
  }

  /**
   * Convertit les valeurs du formulaire en objet ScheduleSettings
   * @param formValue Les valeurs du formulaire
   * @returns Un objet ScheduleSettings
   */
  private convertFormToScheduleSettings(formValue: any): ScheduleSettings {
    const schedule = new ScheduleSettings({
      is24Hours: formValue.is24Hours,
      // Seuls les champs pertinents pour le backend sont inclus
      weeklySchedule: this.buildWeeklySchedule(formValue),
      specialDays: this.currentSchedule?.specialDays || [],
      defaultOpenTime: '08:00',
      defaultCloseTime: '18:00',
    });

    return schedule;
  }

  private buildWeeklySchedule(formValue: any): Map<DayOfWeek, DaySchedule> {
    const weeklySchedule = new Map<DayOfWeek, DaySchedule>();
    const days = [
      { day: DayOfWeek.Monday, prefix: 'monday' },
      { day: DayOfWeek.Tuesday, prefix: 'tuesday' },
      { day: DayOfWeek.Wednesday, prefix: 'wednesday' },
      { day: DayOfWeek.Thursday, prefix: 'thursday' },
      { day: DayOfWeek.Friday, prefix: 'friday' },
      { day: DayOfWeek.Saturday, prefix: 'saturday' },
      { day: DayOfWeek.Sunday, prefix: 'sunday' },
    ];

    days.forEach(({ day, prefix }) => {
      weeklySchedule.set(
        day,
        new DaySchedule({
          isOpen: formValue[`${prefix}Enabled`],
          openTime: formValue[`${prefix}Start`] || '08:00',
          closeTime: formValue[`${prefix}End`] || '18:00',
          breaks: [],
        })
      );
    });

    return weeklySchedule;
  }

  /**
   * Réinitialise les horaires aux valeurs par défaut
   */
  resetToDefault(): void {
    if (!this.centreId) return;

    if (
      confirm(
        'Êtes-vous sûr de vouloir réinitialiser les horaires aux valeurs par défaut ?'
      )
    ) {
      this.isLoading = true;
      this.settingsService.resetScheduleToDefault(this.centreId).subscribe({
        next: (defaultSchedule) => {
          this.currentSchedule = defaultSchedule;
          this.populateFormWithSchedule(defaultSchedule);
          this.successMessage = 'Horaires réinitialisés avec succès';
          this.isLoading = false;
          setTimeout(() => (this.successMessage = null), 3000);
        },
        error: (err) => {
          console.error('Erreur lors de la réinitialisation', err);
          this.errorMessage = 'Erreur lors de la réinitialisation';
          this.isLoading = false;
        },
      });
    }
  }

  /**
   * Copie les horaires du lundi sur tous les jours
   */
  copyMondayToAllDays(): void {
    const mondayValues = {
      enabled: this.scheduleForm.get('mondayEnabled')?.value,
      start: this.scheduleForm.get('mondayStart')?.value,
      end: this.scheduleForm.get('mondayEnd')?.value,
    };

    const days = [
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];
    days.forEach((day) => {
      this.scheduleForm.patchValue({
        [`${day}Enabled`]: mondayValues.enabled,
        [`${day}Start`]: mondayValues.start,
        [`${day}End`]: mondayValues.end,
      });
    });

    this.successMessage = 'Horaires du lundi copiés sur tous les jours';
    setTimeout(() => (this.successMessage = null), 3000);
  }

  /**
   * Applique des horaires standards (9h-17h) sur tous les jours
   */
  applyStandardHours(): void {
    const days = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];
    days.forEach((day) => {
      this.scheduleForm.patchValue({
        [`${day}Enabled`]: day !== 'saturday' && day !== 'sunday',
        [`${day}Start`]: '09:00',
        [`${day}End`]: '17:00',
      });
    });

    this.successMessage = 'Horaires standards appliqués';
    setTimeout(() => (this.successMessage = null), 3000);
  }
  //#endregion

  //#region Aperçu des Horaires
  /**
   * Affiche un aperçu des horaires configurés
   */
  previewSchedule(): void {
    if (this.scheduleForm.invalid) {
      this.errorMessage =
        'Veuillez corriger les erreurs dans le formulaire avant de prévisualiser';
      return;
    }

    this.weekDays = this.buildWeekDaysPreview();
    this.showPreview = true;
  }

  /**
   * Ferme l'aperçu des horaires
   */
  closePreview(): void {
    this.showPreview = false;
  }

  /**
   * Construit un aperçu des jours de la semaine
   * @returns Un tableau de DaySchedule
   */
  private buildWeekDaysPreview(): DaySchedule[] {
    const formValue = this.scheduleForm.value;
    const days = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];

    return days.map(
      (day) =>
        ({
          isOpen: formValue[`${day}Enabled`],
          openTime: formValue[`${day}Start`] || '08:00',
          closeTime: formValue[`${day}End`] || '18:00',
          breaks: [],
        } as DaySchedule)
    );
  }

  /**
   * Retourne le nom du jour en français
   * @param daySchedule Le jour à nommer
   * @returns Le nom du jour
   */
  getDayName(daySchedule: DaySchedule): string {
    const index = this.weekDays.indexOf(daySchedule);
    const dayNames = [
      'Lundi',
      'Mardi',
      'Mercredi',
      'Jeudi',
      'Vendredi',
      'Samedi',
      'Dimanche',
    ];
    return dayNames[index] || '';
  }

  /**
   * Formate une heure au format HH:mm
   * @param time L'heure à formater
   * @returns L'heure formatée
   */
  private formatTime(time: string | Time): string {
    if (typeof time === 'string') {
      return time;
    }
    return `${time.hours.toString().padStart(2, '0')}:${time.minutes
      .toString()
      .padStart(2, '0')}`;
  }

  /**
   * Validateur pour les champs heure
   */
  private timeValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(value) ? null : { invalidTime: true };
  }

  /**
   * Validateur pour vérifier que l'heure de fin est après l'heure de début
   * @param startTimeControlName Le nom du contrôle de l'heure de début
   */
  private endTimeValidator(startTimeControlName: string) {
    return (control: AbstractControl): ValidationErrors | null => {
      const startTimeControl = control.parent?.get(startTimeControlName);
      if (!startTimeControl) return null;

      const startTime = startTimeControl.value;
      const endTime = control.value;

      if (!startTime || !endTime) return null;

      const startDate = new Date(`1970-01-01T${startTime}:00`);
      const endDate = new Date(`1970-01-01T${endTime}:00`);

      return endDate > startDate ? null : { invalidTimeRange: true };
    };
  }
  //#endregion

  //#region Utilitaires
  /**
   * Retourne le nom complet de l'utilisateur connecté
   * @returns Le nom complet ou 'Utilisateur' par défaut
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
   * @returns Le rôle ou 'Rôle non défini' par défaut
   */
  getUserRole(): string {
    if (!this.currentUser) return 'Rôle non défini';

    if (this.currentUser.roles && this.currentUser.roles.length > 0) {
      return this.mapRoleIdToName(this.currentUser.roles[0]);
    }

    const role = this.authService.getUserRole();
    return role ? this.mapRoleIdToName(role) : 'Rôle non défini';
  }

  /**
   * Mappe un ID de rôle à son nom affichable
   * @param roleId L'ID du rôle
   * @returns Le nom du rôle
   */
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
   * Déconnecte l'utilisateur
   */
  logout(): void {
    if (this.authService.isAuthenticated()) {
      try {
        console.log('État du localStorage avant déconnexion:', {
          token: !!this.authService.getToken(),
        });

        this.authService.logout();

        console.log('État du localStorage après déconnexion:', {
          token: !!this.authService.getToken(),
        });

        this.router.navigate(['/auth/login']);
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        this.router.navigate(['/auth/login']);
      }
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Diagnostique les problèmes avec le centreId
   */
  diagnoseCentreIdIssue(): void {
    console.log('🔍 === DIAGNOSTIC CENTRE ID ===');
    console.log('CurrentUser:', this.currentUser);
    console.log('CentreId from component:', this.centreId);
    console.log('CentreId from currentUser:', this.currentUser?.centreId);
    console.log('AuthService token:', this.authService.getToken());
    console.log('LocalStorage userRole:', localStorage.getItem('userRole'));
    console.log(
      'LocalStorage profile:',
      localStorage.getItem('currentUserProfile')
    );

    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Token payload:', payload);
      } catch (e) {
        console.error('Erreur décodage token:', e);
      }
    }
  }
  //#endregion
}

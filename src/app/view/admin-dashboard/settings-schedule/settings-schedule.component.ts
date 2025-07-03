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
import { CommonModule } from '@angular/common';
import { DayOfWeek } from '../../../core/models/Settings/DayOfWeek';
import { ScheduleSettings } from '../../../core/models/Settings/ScheduleSettings';
import { SettingsService } from '../../../core/services/Settings/settings.service';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { DomSanitizer } from '@angular/platform-browser';
import { Users } from '../../../core/models/Users/Users';
import { HttpErrorResponse } from '@angular/common/http';

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

  users: Users[] = []; // Liste complète des utilisateurs.
  displayedUsers: Users[] = []; // Liste des utilisateurs affichés sur la page actuelle.
  currentUser: Users | null = null; // Utilisateur actuellement connecté.
  user: Users | null = null; // Informations sur l'utilisateur connecté.
  centreId: string = ''; // ID du centre de l'utilisateur connecté.

  isAdmin: boolean = false; // Indique si l'utilisateur est administrateur
  selectedCentreId: string = ''; // Centre sélectionné pour les administrateurs
  availableCentres: any[] = []; // Liste des centres disponibles
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
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadUserData();
    this.getUsers();
    this.loadCurrentUser();
    this.subscribeToUserChanges();
  }

  /**
   * Charge les données utilisateur et initialise le composant
   */
  private loadUserData(): void {
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
  private subscribeToUserChanges(): void {
    this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
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
    this.authService.loadCurrentUserProfile().subscribe({
      next: (user) => {
        if (user) {
          this.currentUser = user;
          this.loadCurrentUserPhoto();
        } else {
          this.fallbackToUsersService();
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement du profil utilisateur', error);
        this.fallbackToUsersService();
      },
    });
  }

  /**
   * Méthode de secours pour charger l'utilisateur via UsersService
   */
  private fallbackToUsersService(): void {
    this.usersService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
      },
      error: (error) => {
        console.error("Erreur lors du chargement de l'utilisateur connecté", error);
      },
    });
  }

  /**
   * Charge la photo de l'utilisateur actuel
   */
  loadCurrentUserPhoto(): void {
    if (!this.currentUser) return;

    if (this.currentUser.photoUrl && typeof this.currentUser.photoUrl === 'string') {
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
          console.error('Erreur lors du chargement de la photo utilisateur', error);
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
  private setDefaultUserPhoto(): void {
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
  private checkUserRole(user: Users): void {
    this.isAdmin =
      user.roles?.some(
        (role) =>
          role.toLowerCase().includes('admin') ||
          role.toLowerCase().includes('administrator')
      ) || false;
  }

  /**
   * Gère le comportement en fonction du rôle de l'utilisateur
   * @param user L'utilisateur connecté
   */
  private handleUserBasedOnRole(user: Users): void {
    if (this.isAdmin) {
      this.handleAdminUser();
    } else if (user.centreId) {
      this.centreId = user.centreId;
      this.loadScheduleSettings();
    } else {
      this.handleUserWithoutCentre();
    }
  }

  /**
   * Gère le cas d'un utilisateur administrateur
   */
  private handleAdminUser(): void {
    console.log('👑 Utilisateur administrateur détecté');
    this.showCentreSelector = true;
    this.loadAvailableCentres();
    this.loadScheduleSettingsForAdmin();
  }

  /**
   * Gère le cas d'un utilisateur sans centre assigné
   */
  private handleUserWithoutCentre(): void {
    console.warn('⚠️ Utilisateur sans centre assigné');
    this.errorMessage =
      "Votre compte n'est pas associé à un centre. Contactez l'administrateur.";
    this.initializeDefaultSchedule();
  }

  /**
   * Charge la liste des centres disponibles
   */
  private loadAvailableCentres(): void {
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
      this.loadScheduleSettingsForAdmin(centreId);
    }
  }
  //#endregion

  //#region Gestion des Horaires
  /**
   * Initialise le formulaire des horaires
   */
  private initializeForm(): void {
    this.scheduleForm = this.formBuilder.group({
      // Jours de la semaine avec activation et horaires
      mondayEnabled: [true],
      mondayStart: ['08:00', [this.timeValidator]],
      mondayEnd: ['18:00', [this.timeValidator]],

      tuesdayEnabled: [true],
      tuesdayStart: ['08:00', [this.timeValidator]],
      tuesdayEnd: ['18:00', [this.timeValidator]],

      wednesdayEnabled: [true],
      wednesdayStart: ['08:00', [this.timeValidator]],
      wednesdayEnd: ['18:00', [this.timeValidator]],

      thursdayEnabled: [true],
      thursdayStart: ['08:00', [this.timeValidator]],
      thursdayEnd: ['18:00', [this.timeValidator]],

      fridayEnabled: [true],
      fridayStart: ['08:00', [this.timeValidator]],
      fridayEnd: ['18:00', [this.timeValidator]],

      saturdayEnabled: [false],
      saturdayStart: ['08:00', [this.timeValidator]],
      saturdayEnd: ['17:00', [this.timeValidator]],

      sundayEnabled: [false],
      sundayStart: ['08:00', [this.timeValidator]],
      sundayEnd: ['17:00', [this.timeValidator]],

      // Paramètres généraux
      timezone: ['Africa/Abidjan', [Validators.required]],
      defaultBreakDuration: [30, [Validators.min(0), Validators.max(480)]],
      overtimeThreshold: [40, [Validators.min(1), Validators.max(80)]],
      notificationsEnabled: [true],
      arrivalTolerance: [15, [Validators.min(0), Validators.max(60)]],
      weekStartDay: ['monday'],
    });

    this.addTimeRangeValidators();
  }

  /**
   * Charge les paramètres d'horaire pour un centre spécifique
   */
  private loadScheduleSettings(): void {
    if (!this.centreId || this.centreId.trim() === '') {
      console.error('❌ CentreId non disponible pour loadScheduleSettings');
      this.errorMessage = 'ID du centre non disponible';
      return;
    }

    console.log('🔄 Chargement des paramètres pour le centre:', this.centreId);
    this.isLoading = true;

    this.settingsService
      .getScheduleSettings(this.centreId, this.isAdmin)
      .subscribe({
        next: (settings) => {
          console.log('✅ Paramètres chargés:', settings);
          this.populateForm(settings);
          this.isLoading = false;
        },
        error: (err: HttpErrorResponse) => {
          console.error('❌ Erreur lors du chargement des horaires:', err);
          this.errorMessage =
            'Impossible de charger les horaires. Veuillez réessayer.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Charge les paramètres d'horaire pour un administrateur
   * @param centreId L'ID du centre (optionnel)
   */
  private loadScheduleSettingsForAdmin(centreId?: string): void {
    this.isLoading = true;

    if (centreId) {
      this.selectedCentreId = centreId;
      this.settingsService
        .getScheduleSettings(centreId, this.isAdmin)
        .subscribe({
          next: (settings) => {
            console.log('✅ Paramètres chargés pour le centre:', centreId, settings);
            this.populateForm(settings);
            this.isLoading = false;
          },
          error: (err) => {
            console.error('❌ Erreur chargement paramètres centre:', err);
            this.loadDefaultSettingsForAdmin();
          },
        });
    } else {
      this.loadDefaultSettingsForAdmin();
    }
  }

  /**
   * Charge les paramètres par défaut pour un administrateur
   */
  private loadDefaultSettingsForAdmin(): void {
    this.settingsService.getScheduleSettings(undefined, true).subscribe({
      next: (settings) => {
        console.log('✅ Paramètres par défaut chargés pour admin:', settings);
        this.populateForm(settings);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Erreur chargement paramètres par défaut:', err);
        this.initializeDefaultSchedule();
      },
    });
  }

  /**
   * Initialise un horaire par défaut
   */
  private initializeDefaultSchedule(): void {
    console.log('Initialisation avec des horaires par défaut');
    const defaultSettings = new ScheduleSettings();
    this.populateForm(defaultSettings);
    this.isLoading = false;
  }

  /**
   * Construit un objet ScheduleSettings à partir des valeurs du formulaire
   * @returns Un objet ScheduleSettings configuré
   */
  private buildScheduleSettingsFromForm(): ScheduleSettings {
    const formValue = this.scheduleForm.value;
    console.log('📋 Valeurs du formulaire:', formValue);

    const scheduleSettings = new ScheduleSettings();

    // Configuration des jours de la semaine
    const daysMapping = [
      { formDay: 'monday', dayOfWeek: DayOfWeek.Monday },
      { formDay: 'tuesday', dayOfWeek: DayOfWeek.Tuesday },
      { formDay: 'wednesday', dayOfWeek: DayOfWeek.Wednesday },
      { formDay: 'thursday', dayOfWeek: DayOfWeek.Thursday },
      { formDay: 'friday', dayOfWeek: DayOfWeek.Friday },
      { formDay: 'saturday', dayOfWeek: DayOfWeek.Saturday },
      { formDay: 'sunday', dayOfWeek: DayOfWeek.Sunday }
    ];

    scheduleSettings.weeklySchedule.clear();

    daysMapping.forEach(({ formDay, dayOfWeek }) => {
      const daySchedule = new DaySchedule({
        isOpen: formValue[`${formDay}Enabled`] || false,
        openTime: formValue[`${formDay}Start`] || '08:00',
        closeTime: formValue[`${formDay}End`] || '18:00',
        breaks: []
      });

      scheduleSettings.weeklySchedule.set(dayOfWeek, daySchedule);
      console.log(`📅 ${dayOfWeek}:`, daySchedule);
    });

    // Configuration des paramètres généraux
    scheduleSettings.is24Hours = false;
    scheduleSettings.defaultOpenTime = formValue.defaultOpenTime || '08:00';
    scheduleSettings.defaultCloseTime = formValue.defaultCloseTime || '18:00';
    scheduleSettings.specialDays = [];

    console.log('🏗️ ScheduleSettings construit:', scheduleSettings);
    console.log('🗓️ WeeklySchedule Map:', Array.from(scheduleSettings.weeklySchedule.entries()));

    return scheduleSettings;
  }

  /**
   * Peuple le formulaire avec les paramètres d'horaire
   * @param settings Les paramètres d'horaire à afficher
   */
  private populateForm(settings: ScheduleSettings): void {
    console.log('🔄 Peuplement du formulaire avec:', settings);

    const formUpdates: any = {};

    const daysMapping = [
      { formDay: 'monday', dayOfWeek: DayOfWeek.Monday },
      { formDay: 'tuesday', dayOfWeek: DayOfWeek.Tuesday },
      { formDay: 'wednesday', dayOfWeek: DayOfWeek.Wednesday },
      { formDay: 'thursday', dayOfWeek: DayOfWeek.Thursday },
      { formDay: 'friday', dayOfWeek: DayOfWeek.Friday },
      { formDay: 'saturday', dayOfWeek: DayOfWeek.Saturday },
      { formDay: 'sunday', dayOfWeek: DayOfWeek.Sunday }
    ];

    daysMapping.forEach(({ formDay, dayOfWeek }) => {
      const daySchedule = settings.weeklySchedule.get(dayOfWeek);
      if (daySchedule) {
        formUpdates[`${formDay}Enabled`] = daySchedule.isOpen;
        formUpdates[`${formDay}Start`] = this.convertTimeSpanToHHmm(daySchedule.openTime);
        formUpdates[`${formDay}End`] = this.convertTimeSpanToHHmm(daySchedule.closeTime);
      }
    });

    formUpdates.defaultOpenTime = this.convertTimeSpanToHHmm(settings.defaultOpenTime);
    formUpdates.defaultCloseTime = this.convertTimeSpanToHHmm(settings.defaultCloseTime);

    this.scheduleForm.patchValue(formUpdates);
    console.log('📝 Formulaire mis à jour avec:', formUpdates);
  }

  /**
   * Convertit un TimeSpan en format HH:mm
   * @param timeSpan Le TimeSpan à convertir
   * @returns Le temps au format HH:mm
   */
  private convertTimeSpanToHHmm(timeSpan: string): string {
    if (!timeSpan) return '08:00';

    if (timeSpan.match(/^\d{2}:\d{2}$/)) {
      return timeSpan;
    }

    if (timeSpan.match(/^\d{2}:\d{2}:\d{2}$/)) {
      return timeSpan.substring(0, 5);
    }

    return '08:00';
  }
  //#endregion

  //#region Actions du Formulaire
  /**
   * Soumet le formulaire des horaires
   */
  onSubmit(): void {
    if (this.scheduleForm.invalid) {
      this.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const scheduleSettings = this.buildScheduleSettingsFromForm();
    console.log('🚀 Paramètres avant envoi:', scheduleSettings);
    this.settingsService.getScheduleSettings(this.centreId, this.isAdmin);

    const targetCentreId = this.isAdmin ? this.selectedCentreId : this.centreId;

    if (!targetCentreId) {
      this.errorMessage = 'Veuillez sélectionner un centre pour sauvegarder les paramètres.';
      this.isLoading = false;
      return;
    }

    const updateMethod = this.isAdmin ?
      this.settingsService.updateScheduleSettingsForCentre(targetCentreId, scheduleSettings) :
      this.settingsService.updateScheduleSettings(targetCentreId, scheduleSettings);

    updateMethod.subscribe({
      next: (response) => {
        console.log('✅ Mise à jour réussie:', response);
        this.successMessage = 'Les horaires ont été mis à jour avec succès.';
        this.isLoading = false;
        setTimeout(() => this.successMessage = null, 5000);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Erreur lors de la mise à jour des horaires:', err);
        console.error('❌ Détails de l\'erreur:', err.error);

        if (err.error?.errors) {
          const errorMessages = Object.values(err.error.errors).flat();
          this.errorMessage = `Erreurs de validation: ${errorMessages.join(', ')}`;
        } else {
          this.errorMessage = 'Une erreur est survenue lors de la mise à jour des horaires.';
        }

        this.isLoading = false;
        setTimeout(() => this.errorMessage = null, 10000);
      }
    });
  }

  /**
   * Réinitialise le formulaire
   */
  onReset(): void {
    this.scheduleForm.reset();
    this.initializeForm();
    this.errorMessage = null;
    this.successMessage = null;
  }

  /**
   * Copie les horaires du lundi vers tous les autres jours
   */
  copyScheduleToAll(): void {
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
  }

  /**
   * Configure uniquement les jours de semaine (pas de week-end)
   */
  setWeekdaysOnly(): void {
    this.scheduleForm.patchValue({
      mondayEnabled: true,
      tuesdayEnabled: true,
      wednesdayEnabled: true,
      thursdayEnabled: true,
      fridayEnabled: true,
      saturdayEnabled: false,
      sundayEnabled: false,
    });
  }

  /**
   * Définit un horaire par défaut (9h-17h en semaine)
   */
  setDefaultSchedule(): void {
    this.scheduleForm.patchValue({
      mondayEnabled: true,
      mondayStart: '09:00',
      mondayEnd: '17:00',
      tuesdayEnabled: true,
      tuesdayStart: '09:00',
      tuesdayEnd: '17:00',
      wednesdayEnabled: true,
      wednesdayStart: '09:00',
      wednesdayEnd: '17:00',
      thursdayEnabled: true,
      thursdayStart: '09:00',
      thursdayEnd: '17:00',
      fridayEnabled: true,
      fridayStart: '09:00',
      fridayEnd: '17:00',
      saturdayEnabled: false,
      saturdayStart: '09:00',
      saturdayEnd: '17:00',
      sundayEnabled: false,
      sundayStart: '09:00',
      sundayEnd: '17:00',
    });
  }

  /**
   * Marque tous les champs du formulaire comme touchés
   */
  private markAllAsTouched(): void {
    Object.values(this.scheduleForm.controls).forEach((control) => {
      control.markAsTouched();
    });
  }
  //#endregion

  //#region Validation
  /**
   * Ajoute des validateurs pour les plages horaires
   */
  private addTimeRangeValidators(): void {
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
      const endControl = this.scheduleForm.get(`${day}End`);
      if (endControl) {
        endControl.addValidators(this.timeRangeValidator(day));
      }
    });
  }

  /**
   * Valide le format d'une heure
   * @param control Le contrôle à valider
   * @returns Un objet d'erreur ou null
   */
  private timeValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(control.value)) {
      return { invalidTime: true };
    }
    return null;
  }

  /**
   * Valide qu'une plage horaire est valide (heure de fin > heure de début)
   * @param dayPrefix Le préfixe du jour (ex: 'monday')
   * @returns Une fonction de validation
   */
  private timeRangeValidator(dayPrefix: string) {
    return (control: AbstractControl): ValidationErrors | null => {
      const form = control.parent;
      if (!form) return null;

      const enabledControl = form.get(`${dayPrefix}Enabled`);
      const startControl = form.get(`${dayPrefix}Start`);

      if (!enabledControl?.value || !startControl?.value || !control.value) {
        return null;
      }

      const startTime = this.timeToMinutes(startControl.value);
      const endTime = this.timeToMinutes(control.value);

      if (endTime <= startTime) {
        return { invalidTimeRange: true };
      }

      return null;
    };
  }

  /**
   * Convertit une heure en minutes
   * @param timeString L'heure au format HH:mm
   * @returns Le nombre total de minutes
   */
  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
  //#endregion

  //#region Aperçu des Horaires
  /**
   * Affiche un aperçu des horaires configurés
   */
  previewSchedule(): void {
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
    console.log('LocalStorage profile:', localStorage.getItem('currentUserProfile'));

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

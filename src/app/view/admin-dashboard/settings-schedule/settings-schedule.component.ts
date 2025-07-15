import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import {
  FormGroup,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { DomSanitizer } from '@angular/platform-browser';
import { Users } from '../../../core/models/Users/Users';
import {
  DayOfWeek,
  ScheduleSettings,
} from '../../../core/models/Settings/ScheduleSettings';
import { ScheduleSettingsService } from '../../../core/services/ScheduleSettings/schedule-settings.service';

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
  isLoading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  currentSettings: ScheduleSettings | null = null;

  users: Users[] = [];
  displayedUsers: Users[] = [];
  currentUser: Users | null = null;
  user: Users | null = null;
  centreId: string = '';

  isAdmin: boolean = false;
  selectedCentreId: string = '';
  availableCentres: any[] = [];
  showCentreSelector: boolean = true;
  loadCurrentUserAndCentre: any;

  // Options pour les jours de la semaine
  daysOfWeek = [
    { id: DayOfWeek.Monday, name: 'Lundi', controlName: 'monday' },
    { id: DayOfWeek.Tuesday, name: 'Mardi', controlName: 'tuesday' },
    { id: DayOfWeek.Wednesday, name: 'Mercredi', controlName: 'wednesday' },
    { id: DayOfWeek.Thursday, name: 'Jeudi', controlName: 'thursday' },
    { id: DayOfWeek.Friday, name: 'Vendredi', controlName: 'friday' },
    { id: DayOfWeek.Saturday, name: 'Samedi', controlName: 'saturday' },
    { id: DayOfWeek.Sunday, name: 'Dimanche', controlName: 'sunday' },
  ];
  //#endregion

  //#region Constructeur et Initialisation
  constructor(
    private sanitizer: DomSanitizer,
    private formBuilder: FormBuilder,
    private router: Router,
    private usersService: UsersService,
    private centresService: CentresService,
    private authService: AuthService,
    private scheduleSettingsService: ScheduleSettingsService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadUserData();
    this.getUsers();
    this.loadCurrentUser();
    // S'abonner aux changements de l'utilisateur connecté
    this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
      }
    });
  }

  /**
   * Initialise le formulaire de paramètres d'horaire
   */
  initForm(): void {
    this.scheduleForm = this.formBuilder.group({
      // Configuration des jours
      mondayEnabled: [true],
      mondayStart: ['08:00'],
      mondayEnd: ['18:00'],

      tuesdayEnabled: [true],
      tuesdayStart: ['08:00'],
      tuesdayEnd: ['18:00'],

      wednesdayEnabled: [true],
      wednesdayStart: ['08:00'],
      wednesdayEnd: ['18:00'],

      thursdayEnabled: [true],
      thursdayStart: ['08:00'],
      thursdayEnd: ['18:00'],

      fridayEnabled: [true],
      fridayStart: ['08:00'],
      fridayEnd: ['18:00'],

      saturdayEnabled: [false],
      saturdayStart: ['10:00'],
      saturdayEnd: ['16:00'],

      sundayEnabled: [false],
      sundayStart: [''],
      sundayEnd: [''],

      // Paramètres généraux
      maxConcurrentWashes: [3],
      defaultWashDurationMinutes: [30],
      breakBetweenWashesMinutes: [5],
      allowOvertimeWork: [true],
      isWeekendWorkAllowed: [false],

      // Pause déjeuner
      lunchBreakStart: ['12:00'],
      lunchBreakEnd: ['13:30'],
    });
  }

  /**
   * Met à jour le formulaire avec les paramètres existants
   * @param settings Les paramètres d'horaire
   */
  updateFormWithSettings(settings: ScheduleSettings): void {
    // Convertir les jours ouvrables en format de formulaire
    const workingDays = settings.workingDays || [];

    this.scheduleForm.patchValue({
      mondayEnabled: workingDays.includes(DayOfWeek.Monday),
      mondayStart: this.formatTime(settings.openingTime),
      mondayEnd: this.formatTime(settings.closingTime),

      tuesdayEnabled: workingDays.includes(DayOfWeek.Tuesday),
      tuesdayStart: this.formatTime(settings.openingTime),
      tuesdayEnd: this.formatTime(settings.closingTime),

      wednesdayEnabled: workingDays.includes(DayOfWeek.Wednesday),
      wednesdayStart: this.formatTime(settings.openingTime),
      wednesdayEnd: this.formatTime(settings.closingTime),

      thursdayEnabled: workingDays.includes(DayOfWeek.Thursday),
      thursdayStart: this.formatTime(settings.openingTime),
      thursdayEnd: this.formatTime(settings.closingTime),

      fridayEnabled: workingDays.includes(DayOfWeek.Friday),
      fridayStart: this.formatTime(settings.openingTime),
      fridayEnd: this.formatTime(settings.closingTime),

      saturdayEnabled: workingDays.includes(DayOfWeek.Saturday),
      saturdayStart: this.formatTime(settings.openingTime),
      saturdayEnd: this.formatTime(settings.closingTime),

      sundayEnabled: workingDays.includes(DayOfWeek.Sunday),
      sundayStart: this.formatTime(settings.openingTime),
      sundayEnd: this.formatTime(settings.closingTime),

      maxConcurrentWashes: settings.maxConcurrentWashes,
      defaultWashDurationMinutes: settings.defaultWashDurationMinutes,
      breakBetweenWashesMinutes: settings.breakBetweenWashesMinutes,
      allowOvertimeWork: settings.allowOvertimeWork,
      isWeekendWorkAllowed: settings.isWeekendWorkAllowed,
      lunchBreakStart: this.formatTime(settings.lunchBreakStart),
      lunchBreakEnd: this.formatTime(settings.lunchBreakEnd),
    });
  }

  formatTime(timeString: string | undefined): string {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  }

  onSubmit(): void {
    console.log('Form status:', this.scheduleForm.status);
    console.log('Form errors:', this.scheduleForm.errors);
    console.log('Centre ID:', this.centreId);
    console.log('Selected Centre ID:', this.selectedCentreId);

    // Validation
    if (this.scheduleForm.invalid) {
      this.errorMessage = 'Veuillez corriger les erreurs du formulaire';
      return;
    }

    if (!this.centreId) {
      this.errorMessage = 'Veuillez sélectionner un centre';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const formValue = this.scheduleForm.value;

    // Convertir les jours sélectionnés en tableau DayOfWeek
    const workingDays: DayOfWeek[] = [];
    this.daysOfWeek.forEach((day) => {
      if (formValue[day.controlName + 'Enabled']) {
        workingDays.push(day.id);
      }
    });

    // Prendre les heures du premier jour activé comme heures générales
    let openingTime = '08:00:00';
    let closingTime = '18:00:00';

    const firstActiveDay = this.daysOfWeek.find(
      (day) => formValue[day.controlName + 'Enabled']
    );
    if (firstActiveDay) {
      openingTime = formValue[firstActiveDay.controlName + 'Start'] + ':00';
      closingTime = formValue[firstActiveDay.controlName + 'End'] + ':00';
    }

    // Créer l'objet settings
    const settings: ScheduleSettings = {
      id: this.currentSettings?.id || undefined,
      centreId: this.centreId,
      openingTime,
      closingTime,
      workingDays,
      maxConcurrentWashes: formValue.maxConcurrentWashes || 3,
      defaultWashDurationMinutes: formValue.defaultWashDurationMinutes || 30,
      breakBetweenWashesMinutes: formValue.breakBetweenWashesMinutes || 5,
      allowOvertimeWork: formValue.allowOvertimeWork || false,
      isWeekendWorkAllowed: formValue.isWeekendWorkAllowed || false,
      lunchBreakStart: formValue.lunchBreakStart
        ? formValue.lunchBreakStart + ':00'
        : undefined,
      lunchBreakEnd: formValue.lunchBreakEnd
        ? formValue.lunchBreakEnd + ':00'
        : undefined,
      createdAt: this.currentSettings?.createdAt || new Date(),
      updatedAt: new Date(),
      updatedBy: this.currentUser?.id || 'admin',
    };

    console.log('Settings à enregistrer:', settings);

    const saveOperation = this.currentSettings
      ? this.scheduleSettingsService.updateScheduleSettings(
          settings,
          this.currentUser?.id || 'admin'
        )
      : this.scheduleSettingsService.createScheduleSettings(settings);

    saveOperation.subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Réponse sauvegarde:', response);

        if (response.success) {
          this.successMessage = 'Paramètres enregistrés avec succès';
          this.currentSettings = response.data;
          setTimeout(() => (this.successMessage = null), 5000);
        } else {
          this.errorMessage =
            response.message || 'Erreur lors de la sauvegarde';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Erreur sauvegarde:', error);
        this.errorMessage = 'Erreur lors de la sauvegarde des paramètres';
        setTimeout(() => (this.errorMessage = null), 5000);
      },
    });
  }

  onReset(): void {
    if (this.currentSettings) {
      this.updateFormWithSettings(this.currentSettings);
    } else {
      this.scheduleForm.reset();
      this.initForm();
    }
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  //#region Méthodes de gestion des paramètres

  /**
   * Vérifie si un créneau horaire est disponible
   * @param dateTime La date et heure à vérifier
   */
  checkTimeSlotAvailability(dateTime: Date): void {
    if (!this.centreId) return;

    this.scheduleSettingsService
      .isTimeSlotAvailable(this.centreId, dateTime)
      .subscribe({
        next: (response) => {
          if (response.success) {
            const message = response.data
              ? 'Créneau disponible'
              : 'Créneau non disponible';
            this.successMessage = message;
            setTimeout(() => (this.successMessage = null), 3000);
          }
        },
        error: (error) => {
          console.error('Erreur de vérification', error);
          this.errorMessage = 'Erreur lors de la vérification';
          setTimeout(() => (this.errorMessage = null), 5000);
        },
      });
  }

  /**
   * Récupère les créneaux disponibles pour une date donnée
   * @param date La date à vérifier
   */
  getAvailableSlots(date: Date): void {
    if (!this.centreId) return;

    this.scheduleSettingsService
      .getAvailableTimeSlots(this.centreId, date)
      .subscribe({
        next: (response) => {
          if (response.success) {
            console.log('Créneaux disponibles:', response.data);
            // Traiter les créneaux disponibles ici
          }
        },
        error: (error) => {
          console.error('Erreur de récupération', error);
        },
      });
  }
  //#endregion

  /**
   * Charge les données utilisateur et initialise le composant
   */
  loadUserData(): void {
    this.authService.loadCurrentUserProfile().subscribe({
      next: (user) => {
        if (user) {
          this.currentUser = user;
          this.checkUserRole(user);
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
        }
      },
      error: (err) => {
        console.error('❌ Erreur lors du chargement utilisateur:', err);
        this.errorMessage = 'Erreur lors du chargement des données utilisateur';
      },
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
    // Récupérer les noms des rôles depuis l'API ou le localStorage
    // au lieu de comparer directement les IDs
    this.isAdmin = this.checkIfUserIsAdmin(user.roles);

    console.log('User roles:', user.roles);
    console.log('Is admin:', this.isAdmin);

    if (this.isAdmin) {
      this.showCentreSelector = true;
      this.loadCentres();
    } else {
      this.centreId = user.centreId || '';
      this.selectedCentreId = user.centreId || '';
      this.showCentreSelector = false;

      if (this.centreId) {
        this.loadScheduleSettings();
      }
    }
  }

  private checkIfUserIsAdmin(roleIds: string[]): boolean {
    // ID du rôle admin dans votre base de données
    const ADMIN_ROLE_ID = '6857b69ad24152b1c4b778e9';
    return roleIds?.includes(ADMIN_ROLE_ID) || false;
  }

  loadCentres(): void {
    this.centresService.getAllCentres().subscribe({
      next: (centres) => {
        this.availableCentres = centres;
        this.showCentreSelector = this.isAdmin && centres.length > 0;

        // Si admin avec un seul centre, le sélectionner automatiquement
        if (this.isAdmin && centres.length === 1) {
          this.selectedCentreId = centres[0].id || '';
          this.centreId = centres[0].id || '';
          this.loadScheduleSettings(); // Charger les paramètres existants
        }

        // Si pas admin, utiliser le centre de l'utilisateur
        if (!this.isAdmin && this.currentUser?.centreId) {
          this.selectedCentreId = this.currentUser.centreId;
          this.centreId = this.currentUser.centreId;
          this.loadScheduleSettings();
        }
      },
      error: (error) => {
        console.error('Erreur chargement centres', error);
        this.errorMessage = 'Erreur lors du chargement des centres';
      },
    });
  }

  onCentreChange(): void {
    if (this.selectedCentreId) {
      this.centreId = this.selectedCentreId;
      this.loadScheduleSettings(); // Charger les paramètres du centre sélectionné
    }
  }

  /**
   * * Charge les paramètres d'horaire pour le centre sélectionné
   * @param centreId Identifiant du centre
   */
  loadScheduleSettings(): void {
    if (!this.centreId) return;

    this.isLoading = true;

    // Utiliser getScheduleSettings au lieu de getScheduleSettingsByCentreId
    this.scheduleSettingsService.getScheduleSettings(this.centreId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.currentSettings = response.data;
          this.updateFormWithSettings(response.data);
        } else {
          // Aucun paramètre existant, utiliser les valeurs par défaut
          this.currentSettings = null;
          this.initForm();
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Erreur chargement paramètres:', error);
        // Pas d'erreur affichée, utiliser les valeurs par défaut
        this.currentSettings = null;
        this.initForm();
      },
    });
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

import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { FormGroup, FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DaySchedule } from '../../../core/models/Settings/DaySchedule';
import { CommonModule } from '@angular/common';
import { DayOfWeek } from '../../../core/models/Settings/DayOfWeek';
import { ScheduleSettings } from '../../../core/models/Settings/ScheduleSettings';
import { SettingsService } from '../../../core/services/Settings/settings.service';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { DomSanitizer } from '@angular/platform-browser';
import { Users } from '../../../core/models/Users/Users';

@Component({
  selector: 'app-settings-schedule',
  imports: [RouterLink,
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
  ],
  templateUrl: './settings-schedule.component.html',
  styleUrl: './settings-schedule.component.scss'
})
export class SettingsScheduleComponent implements OnInit {
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
    this.loadCurrentSchedule();
        this.getUsers(); // Récupère les utilisateurs.
    this.loadCurrentUser(); // Charge l'utilisateur connecté

    // S'abonner aux changements de l'utilisateur connecté
    this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
      }
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
   * Retourne le nom du jour de la semaine en fonction de l'index
   * @param day Le jour de la semaine
   * @returns Le nom du jour
   */
  getDayName(day: DaySchedule): string {
  const dayIndex = this.weekDays.indexOf(day);
  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  return dayNames[dayIndex] || '';
}

  /**
   * Initialise le formulaire des horaires avec les validateurs appropriés
   */
  private initializeForm(): void {
    this.scheduleForm = this.formBuilder.group({
      // Jours de la semaine avec leurs statuts et horaires
      mondayEnabled: [true],
      mondayStart: ['09:00', [this.timeValidator]],
      mondayEnd: ['17:00', [this.timeValidator]],

      tuesdayEnabled: [true],
      tuesdayStart: ['09:00', [this.timeValidator]],
      tuesdayEnd: ['17:00', [this.timeValidator]],

      wednesdayEnabled: [true],
      wednesdayStart: ['09:00', [this.timeValidator]],
      wednesdayEnd: ['17:00', [this.timeValidator]],

      thursdayEnabled: [true],
      thursdayStart: ['09:00', [this.timeValidator]],
      thursdayEnd: ['17:00', [this.timeValidator]],

      fridayEnabled: [true],
      fridayStart: ['09:00', [this.timeValidator]],
      fridayEnd: ['17:00', [this.timeValidator]],

      saturdayEnabled: [false],
      saturdayStart: ['09:00', [this.timeValidator]],
      saturdayEnd: ['13:00', [this.timeValidator]],

      sundayEnabled: [false],
      sundayStart: ['09:00', [this.timeValidator]],
      sundayEnd: ['13:00', [this.timeValidator]],

      // Paramètres généraux
      timezone: ['Africa/Abidjan', [Validators.required]],
      defaultBreakDuration: [30, [Validators.min(0), Validators.max(480)]],
      overtimeThreshold: [40, [Validators.min(1), Validators.max(80)]],
      notificationsEnabled: [true],
      arrivalTolerance: [15, [Validators.min(0), Validators.max(60)]],
      weekStartDay: ['monday']
    });

    // Écouter les changements pour validation en temps réel
    this.setupFormValidation();
  }

  /**
   * Validateur personnalisé pour les heures
   */
  private timeValidator(control: any) {
    if (!control.value) return null;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(control.value) ? null : { invalidTime: true };
  }

  /**
   * Configure la validation du formulaire en temps réel
   */
  private setupFormValidation(): void {
    // Validation des horaires de fin supérieures aux horaires de début
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    days.forEach(day => {
      const startControl = this.scheduleForm.get(`${day}Start`);
      const endControl = this.scheduleForm.get(`${day}End`);

      if (startControl && endControl) {
        startControl.valueChanges.subscribe(() => this.validateTimeRange(day));
        endControl.valueChanges.subscribe(() => this.validateTimeRange(day));
      }
    });
  }

  /**
   * Valide que l'heure de fin est supérieure à l'heure de début
   */
  private validateTimeRange(day: string): void {
    const startTime = this.scheduleForm.get(`${day}Start`)?.value;
    const endTime = this.scheduleForm.get(`${day}End`)?.value;

    if (startTime && endTime && startTime >= endTime) {
      this.scheduleForm.get(`${day}End`)?.setErrors({ invalidTimeRange: true });
    } else {
      const endControl = this.scheduleForm.get(`${day}End`);
      if (endControl?.errors?.['invalidTimeRange']) {
        delete endControl.errors['invalidTimeRange'];
        if (Object.keys(endControl.errors).length === 0) {
          endControl.setErrors(null);
        }
      }
    }
  }

/**
   * Charge les horaires actuels depuis le service
   */
  loadCurrentSchedule(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.centresService.getAllCentres().subscribe({
      next: (centres) => {
        if (centres.length > 0) {
          const firstCentreId = centres[0].id;
          if (firstCentreId) {
            this.settingsService.getScheduleSettings(firstCentreId).subscribe({
              next: (settings) => {
                this.populateFormFromSettings(settings);
                this.isLoading = false;
              },
              error: (error) => {
                console.error('Erreur lors du chargement', error);
                this.setDefaultSchedule();
                this.isLoading = false;
                this.errorMessage = 'Erreur lors du chargement des horaires. Valeurs par défaut appliquées.';
              }
            });
          } else {
            this.setDefaultSchedule();
            this.isLoading = false;
            this.errorMessage = 'Aucun centre trouvé. Valeurs par défaut appliquées.';
          }
        } else {
          this.setDefaultSchedule();
          this.isLoading = false;
          this.errorMessage = 'Aucun centre trouvé. Valeurs par défaut appliquées.';
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des centres', error);
        this.setDefaultSchedule();
        this.isLoading = false;
        this.errorMessage = 'Erreur lors du chargement des centres. Valeurs par défaut appliquées.';
      }
    });
  }

 /**
 * Soumet le formulaire et enregistre les horaires pour tous les centres
 */
onSubmit(): void {
  if (this.scheduleForm.invalid) {
    this.markFormGroupTouched();
    this.errorMessage = 'Veuillez corriger les erreurs dans le formulaire.';
    return;
  }

  if (!this.validateAllTimeRanges()) {
    this.errorMessage = 'Certaines plages horaires sont invalides (heure de fin avant heure de début).';
    return;
  }

  if (!confirm('Voulez-vous appliquer ces horaires à TOUS les centres ?')) {
    return;
  }

  this.isLoading = true;
  this.errorMessage = null;
  this.successMessage = null;

  const formData = this.scheduleForm.value;
  const scheduleSettings = this.mapFormToScheduleSettings(formData);

  // Récupérer tous les IDs de centre
  this.centresService.getAllCentres().subscribe({
    next: (centres) => {
      const centreIds = centres.map(c => c.id).filter((id): id is string => !!id);

      if (centreIds.length === 0) {
        this.isLoading = false;
        this.errorMessage = 'Aucun centre disponible';
        return;
      }

      // Appliquer les horaires à tous les centres
      this.settingsService.updateMultipleCentresSchedules(centreIds, scheduleSettings).subscribe({
        next: (results) => {
          this.isLoading = false;
          const successCount = results.filter(r => r).length;

          if (successCount === centreIds.length) {
            this.successMessage = `Horaires enregistrés avec succès pour ${successCount} centres !`;
          } else {
            this.errorMessage = `Horaires enregistrés pour ${successCount}/${centreIds.length} centres. Certains centres n'ont pas pu être mis à jour.`;
          }

          this.loadCurrentSchedule();
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Une erreur est survenue lors de l\'enregistrement des horaires.';
          console.error('Erreur lors de l\'enregistrement', error);
        }
      });
    },
    error: (error) => {
      this.isLoading = false;
      this.errorMessage = 'Impossible de charger la liste des centres';
      console.error('Erreur lors du chargement des centres', error);
    }
  });
}

  private validateAllTimeRanges(): boolean {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days.every(day => {
      if (!this.scheduleForm.get(`${day}Enabled`)?.value) return true;
      const start = this.scheduleForm.get(`${day}Start`)?.value;
      const end = this.scheduleForm.get(`${day}End`)?.value;
      return start && end && start < end;
    });
  }

  /**
   * Sauvegarde les horaires via l'API
   */
  saveSchedule(formData: any): void {
  // Transformation des données du formulaire en modèle ScheduleSettings
  const scheduleSettings = this.mapFormToScheduleSettings(formData);

  this.settingsService.updateScheduleSettings('centreId', scheduleSettings).subscribe({
    next: (response) => {
      console.log('Enregistrement réussi', response);
      alert('Horaires enregistrés avec succès !');
      // Optionnel: recharger les données
      this.loadCurrentSchedule();
    },
    error: (error) => {
      console.error('Erreur lors de l\'enregistrement', error);
      alert('Une erreur est survenue lors de l\'enregistrement');
    }
  });
}


mapFormToScheduleSettings(formData: any): any {
  const scheduleSettings: any = {
    weeklySchedule: {},
    specialDays: [],
    is24Hours: false,
    defaultOpenTime: this.formatTimeForApi(formData.defaultOpenTime || '08:00'),
    defaultCloseTime: this.formatTimeForApi(formData.defaultCloseTime || '18:00')
  };

  const dayMapping = {
    monday: DayOfWeek.Monday,
    tuesday: DayOfWeek.Tuesday,
    wednesday: DayOfWeek.Wednesday,
    thursday: DayOfWeek.Thursday,
    friday: DayOfWeek.Friday,
    saturday: DayOfWeek.Saturday,
    sunday: DayOfWeek.Sunday
  };

  Object.entries(dayMapping).forEach(([formKey, dayOfWeek]) => {
    scheduleSettings.weeklySchedule[dayOfWeek] = {
      isOpen: formData[`${formKey}Enabled`],
      openTime: this.formatTimeForApi(formData[`${formKey}Start`]),
      closeTime: this.formatTimeForApi(formData[`${formKey}End`]),
      breaks: []
    };
  });

  return { scheduleSettings }; // Notez l'objet englobant
}

private formatTimeForApi(time: string): string {
  // Convertit "HH:mm" en "HH:mm:00" pour l'API
  if (time && time.length === 5 && time.includes(':')) {
    return `${time}:00`;
  }
  return time;
}




populateFormFromSettings(settings: ScheduleSettings): void {
  const formData: any = {};

  // Mapping des jours
  settings.weeklySchedule.forEach((daySchedule, dayOfWeek) => {
    const dayKey = dayOfWeek.toLowerCase();
    formData[`${dayKey}Enabled`] = daySchedule.isOpen;
    formData[`${dayKey}Start`] = daySchedule.openTime; // Correction ici
    formData[`${dayKey}End`] = daySchedule.closeTime;  // Correction ici
  });

  this.scheduleForm.patchValue(formData);
}

  /**
   * Réinitialise le formulaire
   */
  onReset(): void {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser le formulaire ?')) {
      this.scheduleForm.reset();
      this.initializeForm();
      this.loadCurrentSchedule();
    }
  }

  /**
   * Copie les horaires du lundi sur tous les autres jours
   */
  copyScheduleToAll(): void {
    const mondayStart = this.scheduleForm.get('mondayStart')?.value;
    const mondayEnd = this.scheduleForm.get('mondayEnd')?.value;
    const mondayEnabled = this.scheduleForm.get('mondayEnabled')?.value;

    if (mondayStart && mondayEnd) {
      const days = ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

      days.forEach(day => {
        this.scheduleForm.patchValue({
          [`${day}Enabled`]: mondayEnabled,
          [`${day}Start`]: mondayStart,
          [`${day}End`]: mondayEnd
        });
      });

      console.log('Horaires du lundi copiés sur tous les jours');
    }
  }

  /**
   * Configure les horaires pour les jours ouvrables uniquement
   */
  setWeekdaysOnly(): void {
    this.scheduleForm.patchValue({
      mondayEnabled: true,
      tuesdayEnabled: true,
      wednesdayEnabled: true,
      thursdayEnabled: true,
      fridayEnabled: true,
      saturdayEnabled: false,
      sundayEnabled: false
    });

    console.log('Configuration jours ouvrables appliquée');
  }

  /**
   * Applique les horaires par défaut (9h-17h)
   */
  setDefaultSchedule(): void {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    days.forEach(day => {
      this.scheduleForm.patchValue({
        [`${day}Enabled`]: true,
        [`${day}Start`]: '09:00',
        [`${day}End`]: '17:00'
      });
    });

    this.scheduleForm.patchValue({
      saturdayEnabled: false,
      sundayEnabled: false
    });

    console.log('Horaires par défaut appliqués');
  }

  /**
   * Affiche l'aperçu des horaires
   */
  previewSchedule(): void {
    this.generateWeekDaysPreview();
    this.showPreview = true;
    this.errorMessage = null;
  }

  /**
   * Ferme l'aperçu des horaires
   */
  closePreview(): void {
    this.showPreview = false;
  }

  /**
   * Génère les données pour l'aperçu des horaires
   */
  private generateWeekDaysPreview(): void {
  const days = [
    { key: 'monday', name: 'Lundi' },
    { key: 'tuesday', name: 'Mardi' },
    { key: 'wednesday', name: 'Mercredi' },
    { key: 'thursday', name: 'Jeudi' },
    { key: 'friday', name: 'Vendredi' },
    { key: 'saturday', name: 'Samedi' },
    { key: 'sunday', name: 'Dimanche' }
  ];

  this.weekDays = days.map(day => ({
    isOpen: !this.scheduleForm.get(`${day.key}Closed`)?.value,
    openTime: this.scheduleForm.get(`${day.key}Start`)?.value || '09:00',
    closeTime: this.scheduleForm.get(`${day.key}End`)?.value || '17:00',
    breaks: [] // Ou this.getBreaksForDay(day.key)
  } as DaySchedule));
}

  /**
   * Marque tous les champs du formulaire comme touchés pour afficher les erreurs
   */
  private markFormGroupTouched(): void {
    Object.keys(this.scheduleForm.controls).forEach(key => {
      const control = this.scheduleForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Déconnecte l'utilisateur et le redirige vers la page de connexion
   */
  logout(): void {
    if (this.authService.isAuthenticated()) {
      try {
        console.log('État du localStorage avant déconnexion:', {
          token: !!this.authService.getToken(),
          userRole: localStorage.getItem('userRole'),
          profile: localStorage.getItem('currentUserProfile')
        });

        this.authService.logout();

        console.log('État du localStorage après déconnexion:', {
          token: !!this.authService.getToken(),
          userRole: localStorage.getItem('userRole'),
          profile: localStorage.getItem('currentUserProfile')
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
}





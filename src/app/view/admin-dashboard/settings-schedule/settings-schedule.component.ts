import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { FormGroup, FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DaySchedule } from '../../../core/models/Settings/DaySchedule';
import { CommonModule } from '@angular/common';

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

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private usersService: UsersService,
    private authService: AuthService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadCurrentSchedule();
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
  private loadCurrentSchedule(): void {
    // TODO: Implémenter la récupération des horaires depuis l'API
    console.log('Chargement des horaires actuels...');

    // Exemple de données par défaut
    const defaultSchedule = {
      mondayEnabled: true,
      mondayStart: '08:00',
      mondayEnd: '17:00',
      tuesdayEnabled: true,
      tuesdayStart: '08:00',
      tuesdayEnd: '17:00',
      wednesdayEnabled: true,
      wednesdayStart: '08:00',
      wednesdayEnd: '17:00',
      thursdayEnabled: true,
      thursdayStart: '08:00',
      thursdayEnd: '17:00',
      fridayEnabled: true,
      fridayStart: '08:00',
      fridayEnd: '17:00',
      saturdayEnabled: false,
      saturdayStart: '09:00',
      saturdayEnd: '13:00',
      sundayEnabled: false,
      sundayStart: '09:00',
      sundayEnd: '13:00',
      timezone: 'Africa/Abidjan',
      defaultBreakDuration: 60,
      overtimeThreshold: 40,
      notificationsEnabled: true,
      arrivalTolerance: 15,
      weekStartDay: 'monday'
    };

    this.scheduleForm.patchValue(defaultSchedule);
  }

  /**
   * Soumet le formulaire et enregistre les horaires
   */
  onSubmit(): void {
    if (this.scheduleForm.valid) {
      const formData = this.scheduleForm.value;

      console.log('Données des horaires à enregistrer:', formData);

      // TODO: Appel API pour sauvegarder les horaires
      this.saveSchedule(formData);
    } else {
      console.log('Formulaire invalide');
      this.markFormGroupTouched();
    }
  }

  /**
   * Sauvegarde les horaires via l'API
   */
  private saveSchedule(scheduleData: any): void {
    // TODO: Implémenter l'appel API
    console.log('Sauvegarde des horaires:', scheduleData);

    // Simulation d'une sauvegarde réussie
    setTimeout(() => {
      alert('Horaires enregistrés avec succès !');
    }, 500);
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

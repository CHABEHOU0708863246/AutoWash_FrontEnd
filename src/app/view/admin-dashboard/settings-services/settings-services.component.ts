import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { ServiceSetting } from '../../../core/models/Settings/ServiceSetting';
import { SettingsService } from '../../../core/services/Settings/settings.service';
import { UsersService } from '../../../core/services/Users/users.service';

@Component({
  selector: 'app-settings-services',
  imports: [RouterLink, CommonModule, ReactiveFormsModule],
  templateUrl: './settings-services.component.html',
  styleUrl: './settings-services.component.scss',
})
export class SettingsServicesComponent implements OnInit {
  services: ServiceSetting[] = [];
  serviceForm!: FormGroup;
  isLoading = false;
  isEditing = false;
  editingServiceId: string | null = null;
  errorMessage = '';
  successMessage = '';
  // Par cette logique:
  _centreId = '';

get centreId(): string {
  return this._centreId;
}

set centreId(value: string) {
  this._centreId = value;
  if (value) {
    localStorage.setItem('selectedCentreId', value);
  }
}

/**
 * méthode pour initialiser automatiquement l'ID du centre
 */
 async initializeCentreId(): Promise<string> {
  try {
    // Stratégie 1: Paramètre d'URL (priorité haute)
    const urlCentreId = this.route.snapshot.paramMap.get('centreId');
    if (urlCentreId) {
      console.log("Centre ID récupéré depuis l'URL:", urlCentreId);
      return urlCentreId;
    }

    // Stratégie 2: Query parameter
    const queryCentreId = this.route.snapshot.queryParamMap.get('centreId');
    if (queryCentreId) {
      console.log('Centre ID récupéré depuis les query params:', queryCentreId);
      return queryCentreId;
    }

    // Stratégie 3: Token JWT (priorité moyenne)
    const tokenCentreId = this.getCentreIdFromToken();
    if (tokenCentreId) {
      console.log('Centre ID récupéré depuis le token:', tokenCentreId);
      return tokenCentreId;
    }

    // Stratégie 4: Utilisateur connecté
    const userCentreId = await this.getCentreIdFromCurrentUser();
    if (userCentreId) {
      console.log("Centre ID récupéré depuis l'utilisateur connecté:", userCentreId);
      return userCentreId;
    }

    // Stratégie 5: Local Storage (priorité basse)
    const storageCentreId = this.getCentreIdFromStorage();
    if (storageCentreId) {
      console.log('Centre ID récupéré depuis le storage:', storageCentreId);
      return storageCentreId;
    }

    throw new Error("Aucun ID de centre trouvé");

  } catch (error) {
    console.error('Erreur lors de la récupération du centre ID:', error);
    throw error;
  }
}

  constructor(
    private router: Router,
    private route: ActivatedRoute, // Ajout pour récupérer les paramètres d'URL
    private authService: AuthService,
    private settingsService: SettingsService,
    private usersService: UsersService, // Ajout pour récupérer l'utilisateur actuel
    private formBuilder: FormBuilder
  ) {
   this.initializeForm();
  // Initialisation automatique de l'ID du centre
  this.initializeCentreId()
    .then(id => {
      this.centreId = id;
      console.log('Centre ID initialisé:', id);
    })
    .catch(error => {
      this.errorMessage = "Impossible de récupérer l'identifiant du centre";
      console.error('Échec de l\'initialisation du centre ID:', error);
    });
}

  getCategoryLabel(categoryValue: number | string): string {
    // Si c'est déjà une string, retournez-la directement
    if (typeof categoryValue === 'string') return categoryValue;

    // Sinon, faites le mapping avec les valeurs numériques
    switch (categoryValue) {
      case 0:
        return 'Lavage simple';
      case 1:
        return 'Lavage complet';
      case 2:
        return 'Intérieur uniquement';
      case 3:
        return 'Extérieur uniquement';
      case 4:
        return 'Services spéciaux';
      case 5:
        return 'Entretien';
      default:
        return 'Autre';
    }
  }

  categories = [
    { value: 0, label: 'Lavage simple' },
    { value: 1, label: 'Lavage complet' },
    { value: 2, label: 'Intérieur uniquement' },
    { value: 3, label: 'Extérieur uniquement' },
    { value: 4, label: 'Services spéciaux' },
    { value: 5, label: 'Entretien' },
  ];

  getCategoryClass(categoryValue: number | string): string {
    if (typeof categoryValue === 'string') return categoryValue.toLowerCase();

    switch (categoryValue) {
      case 0:
        return 'basic';
      case 1:
        return 'premium';
      case 2:
        return 'interior';
      case 3:
        return 'exterior';
      case 4:
        return 'special';
      case 5:
        return 'maintenance';
      default:
        return 'other';
    }
  }

  async ngOnInit(): Promise<void> {
  // Si l'ID n'est pas encore défini, attendez qu'il soit initialisé
  if (!this.centreId) {
    try {
      const id = await this.initializeCentreId();
      this.centreId = id;
    } catch (error) {
      this.errorMessage = "Impossible de récupérer l'identifiant du centre";
      return;
    }
  }

  if (this.centreId) {
    this.loadServices();
  }
}

  /**
   * Initialise le formulaire pour créer/modifier une prestation
   */
  initializeForm(): void {
    this.serviceForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      isActive: [true],
      estimatedDurationMinutes: [30, [Validators.required, Validators.min(1)]],
      includedServices: [['NON']], // Valeur par défaut comme dans votre exemple
      category: [0, Validators.required], // Valeur numérique
      sortOrder: [1000, [Validators.required, Validators.min(0)]],
      iconUrl: [''],
      requiresApproval: [false],
    });
  }

  /**
   * Récupère dynamiquement l'ID du centre selon plusieurs stratégies
   */
  async getCentreId(): Promise<void> {
    try {
      // Stratégie 1: Paramètre d'URL
      this.centreId = this.route.snapshot.paramMap.get('centreId') || '';

      if (this.centreId) {
        console.log("Centre ID récupéré depuis l'URL:", this.centreId);
        return;
      }

      // Stratégie 2: Query parameter
      this.centreId = this.route.snapshot.queryParamMap.get('centreId') || '';

      if (this.centreId) {
        console.log(
          'Centre ID récupéré depuis les query params:',
          this.centreId
        );
        return;
      }

      // Stratégie 3: Utilisateur connecté
      this.centreId = await this.getCentreIdFromCurrentUser();

      if (this.centreId) {
        console.log(
          "Centre ID récupéré depuis l'utilisateur connecté:",
          this.centreId
        );
        return;
      }

      // Stratégie 4: Token JWT
      this.centreId = this.getCentreIdFromToken();

      if (this.centreId) {
        console.log('Centre ID récupéré depuis le token:', this.centreId);
        return;
      }

      // Stratégie 5: Local Storage
      this.centreId = this.getCentreIdFromStorage();

      if (this.centreId) {
        console.log('Centre ID récupéré depuis le storage:', this.centreId);
        return;
      }

      // Aucune stratégie n'a fonctionné
      this.errorMessage = "Impossible de récupérer l'identifiant du centre";
      console.error('Aucun centre ID trouvé');
    } catch (error) {
      console.error('Erreur lors de la récupération du centre ID:', error);
      this.errorMessage =
        "Erreur lors de la récupération de l'identifiant du centre";
    }
  }

  /**
   * Récupère l'ID du centre depuis l'utilisateur connecté
   */
  async getCentreIdFromCurrentUser(): Promise<string> {
  try {
    // Remplacement de toPromise() par firstValueFrom()
    const { firstValueFrom } = await import('rxjs');
    const currentUser = await firstValueFrom(this.usersService.getCurrentUser());

    // Interface typée pour éviter any
    interface UserWithCentre {
      centreId?: string;
      centre?: { id: string };
    }

    const user = currentUser as UserWithCentre;
    return user?.centreId || user?.centre?.id || '';

  } catch (error) {
    console.log("Impossible de récupérer l'utilisateur connecté:", error);
    return '';
  }
}

  /**
   * Récupère l'ID du centre depuis le token JWT
   */
  getCentreIdFromToken(): string {
  try {
    const token = this.authService.getToken() ||
                  localStorage.getItem('token') ||
                  sessionStorage.getItem('token');

    if (!token) return '';

    // Vérification de la structure du token
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.warn('Format de token JWT invalide');
      return '';
    }

    const payload = JSON.parse(atob(tokenParts[1]));
    return payload.centreId || payload.centre_id || payload.center_id || '';

  } catch (error) {
    console.warn('Erreur lors du décodage du token:', error);
    return '';
  }
}

  /**
   * Récupère l'ID du centre depuis le stockage local
   */
  getCentreIdFromStorage(): string {
  const possibleKeys = [
    'selectedCentreId',
    'centreId',
    'center_id',
    'currentCentreId'
  ];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (value) {
      console.log(`Centre ID trouvé dans le storage avec la clé: ${key}`);
      return value;
    }
  }

  return '';
}

  /**
   * Charge les services du centre
   */
  loadServices(): void {
    if (!this.centreId) {
      this.errorMessage = 'ID du centre manquant';
      return;
    }

    this.isLoading = true;
    this.settingsService.getServices(this.centreId).subscribe({
      next: (services) => {
        this.services = services;
        this.isLoading = false;
        this.errorMessage = '';
      },
      error: (error) => {
        console.error('Erreur lors du chargement des services:', error);
        this.errorMessage = 'Erreur lors du chargement des services';
        this.isLoading = false;
      },
    });
  }

  /**
   * Méthode pour changer de centre (utile pour le multi-centres)
   */
  switchCentre(newCentreId: string): void {
  if (!newCentreId) {
    console.warn('ID de centre invalide');
    return;
  }

  this.centreId = newCentreId; // Utilise le setter pour sauvegarder automatiquement
  this.loadServices();
  console.log('Centre changé vers:', newCentreId);
}

  /**
   * Prépare le formulaire pour l'édition d'une prestation
   */
  editService(service: ServiceSetting): void {
    this.isEditing = true;
    this.editingServiceId = service.id || null; // Correction du type

    this.serviceForm.patchValue({
      name: service.name,
      description: service.description,
      //basePrice: service.basePrice || 0,
      //duration: service.duration || service.estimatedDurationMinutes,
      isActive: service.isActive,
      category: service.category,
      //maxConcurrent: service.maxConcurrent || 1,
      requiresApproval: service.requiresApproval,
    });

    // Scroll vers le formulaire
    document
      .getElementById('service-form')
      ?.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Annule l'édition et remet le formulaire en mode création
   */
  cancelEdit(): void {
    this.isEditing = false;
    this.editingServiceId = null;
    this.serviceForm.reset();
    this.initializeForm();
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Met à jour un service existant
   */
  updateService(service: ServiceSetting): void {
    if (!this.editingServiceId) {
      this.errorMessage = 'ID du service manquant pour la mise à jour';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Ici vous devrez implémenter la méthode updateService dans votre SettingsService
    // this.settingsService.updateService(this.centreId, this.editingServiceId, service).subscribe({
    //   next: (updatedService) => {
    //     const index = this.services.findIndex(s => s.id === this.editingServiceId);
    //     if (index !== -1) {
    //       this.services[index] = updatedService;
    //     }
    //     this.successMessage = 'Service mis à jour avec succès';
    //     this.cancelEdit();
    //     this.isLoading = false;
    //   },
    //   error: (error) => {
    //     this.errorMessage = `Erreur lors de la mise à jour: ${error.message}`;
    //     this.isLoading = false;
    //   }
    // });
  }

  /**
   * Soumet le formulaire (création ou modification)
   */
  onSubmit(): void {
    if (this.serviceForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    if (!this.centreId) {
      this.errorMessage = 'Centre ID manquant';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValue = this.serviceForm.value;

    // Créer l'objet service avec les bonnes propriétés
    const serviceData = new ServiceSetting({
      name: formValue.name?.trim(),
      description: formValue.description?.trim() || '',
      isActive: formValue.isActive ?? true,
      estimatedDurationMinutes:
        formValue.duration || formValue.estimatedDurationMinutes || 30,
      includedServices: formValue.includedServices || ['NON'],
      category: Number(formValue.category),
      sortOrder: formValue.sortOrder || 1000,
      iconUrl: formValue.iconUrl?.trim() || '',
      requiresApproval: formValue.requiresApproval ?? false,
      //basePrice: formValue.basePrice,
      //duration: formValue.duration,
      //maxConcurrent: formValue.maxConcurrent
    });

    if (this.isEditing && this.editingServiceId) {
      // Mise à jour
      serviceData.id = this.editingServiceId;
      this.updateService(serviceData);
    } else {
      // Création
      console.log('Service à créer:', serviceData);
      console.log('Centre ID:', this.centreId);

      this.settingsService.addService(this.centreId, serviceData).subscribe({
        next: (newService) => {
          console.log('Service créé avec succès:', newService);
          this.services.push(newService);
          this.successMessage = 'Service créé avec succès';
          this.serviceForm.reset();
          this.initializeForm();
          this.isLoading = false;

          // Effacer le message de succès après 3 secondes
          setTimeout(() => (this.successMessage = ''), 3000);
        },
        error: (error) => {
          console.error('Erreur lors de la création:', error);
          this.errorMessage = `Erreur lors de la création: ${error.message}`;
          this.isLoading = false;
        },
      });
    }
  }

  /**
   * Active/désactive une prestation
   */
  // toggleServiceStatus(service: ServiceSetting): void {
  //   const updatedService = { ...service, isActive: !service.isActive };

  //   this.settingsService.updateService(this.centreId, service.id, updatedService).subscribe({
  //     next: (updated) => {
  //       const index = this.services.findIndex(s => s.id === service.id);
  //       if (index !== -1) {
  //         this.services[index] = updated;
  //       }
  //     },
  //     error: (error) => {
  //       this.errorMessage = 'Erreur lors de la modification du statut: ' + error.message;
  //     }
  //   });
  // }

  /**
   * Marque tous les champs du formulaire comme touchés pour afficher les erreurs
   */
  markFormGroupTouched(): void {
    Object.keys(this.serviceForm.controls).forEach((key) => {
      this.serviceForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Vérifie si un champ du formulaire a une erreur
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.serviceForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Récupère le message d'erreur pour un champ
   */
  getFieldError(fieldName: string): string {
    const field = this.serviceForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) {
      return 'Ce champ est obligatoire';
    }
    if (field.errors['minlength']) {
      return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
    }
    if (field.errors['min']) {
      return `Valeur minimum: ${field.errors['min'].min}`;
    }

    return 'Champ invalide';
  }

  /**
   * Efface les messages d'erreur et de succès
   */
  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
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
          profile: localStorage.getItem('currentUserProfile'),
        });

        this.authService.logout();

        console.log('État du localStorage après déconnexion:', {
          token: !!this.authService.getToken(),
          userRole: localStorage.getItem('userRole'),
          profile: localStorage.getItem('currentUserProfile'),
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

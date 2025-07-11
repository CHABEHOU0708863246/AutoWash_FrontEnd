import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Centres } from '../../../core/models/Centres/Centres';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { Users } from '../../../core/models/Users/Users';
import { DomSanitizer } from '@angular/platform-browser';
import { UsersService } from '../../../core/services/Users/users.service';

interface Notification {
  show: boolean;
  type: 'success' | 'error' | null;
  message: string;
}

@Component({
  selector: 'app-centres-create',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './centres-create.component.html',
  styleUrl: './centres-create.component.scss',
})
export class CentresCreateComponent {
  //#region Propriétés du composant
  users: Users[] = []; // Liste complète des utilisateurs
  displayedUsers: Users[] = []; // Liste des utilisateurs affichés
  currentUser: Users | null = null; // Utilisateur actuellement connecté
  user: Users | null = null; // Informations sur l'utilisateur connecté

  centre: Centres[] = []; // Liste des centres
  centreForm!: FormGroup; // Formulaire pour créer un centre
  currentStep: number = 1; // Étape actuelle dans le processus de création
  managers: Users[] = []; // Liste des gérants disponibles
  isSubmitting = false; // Indicateur de soumission en cours

  // Configuration des notifications
  notification: Notification = {
    show: false,
    type: null,
    message: ''
  };
  //#endregion

  //#region Constructeur et initialisation
  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService,
    private router: Router,
    private centreService: CentresService,
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.subscribeToCurrentUser();
  }

  /**
   * Charge les données initiales du composant
   */
  private loadInitialData(): void {
    this.getCentres();
    this.getAvailableManagers();
    this.getUsers();
    this.loadCurrentUser();
  }

  /**
   * S'abonne aux changements de l'utilisateur connecté
   */
  private subscribeToCurrentUser(): void {
    this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
      }
    });
  }
  //#endregion

  //#region Gestion du formulaire
  /**
   * Initialise le formulaire avec des valeurs par défaut
   */
  initializeForm(): void {
    this.centreForm = this.formBuilder.group({
      name: ['', Validators.required],
      location: ['', Validators.required],
      ownerId: [''],
      isActive: [true],
      ownerName: [''],
    });
  }

  /**
   * Réinitialise le formulaire aux valeurs par défaut
   */
  onReset(): void {
    this.centreForm.reset({
      isActive: true,
    });
  }
  //#endregion

  //#region Gestion des utilisateurs
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
   * Charge les photos des utilisateurs pour l'affichage
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
   * Charge l'utilisateur actuellement connecté
   */
  loadCurrentUser(): void {
    this.authService.loadCurrentUserProfile().subscribe({
      next: (user) => {
        if (user) {
          this.currentUser = user;
          this.loadCurrentUserPhoto();
        } else {
          this.loadCurrentUserFallback();
        }
      },
      error: () => {
        this.loadCurrentUserFallback();
      },
    });
  }

  /**
   * Méthode de fallback pour charger l'utilisateur actuel
   */
  private loadCurrentUserFallback(): void {
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
   * Charge la photo de l'utilisateur actuellement connecté
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
        error: () => {
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
  //#endregion

  //#region Gestion des centres
  /**
   * Récupère tous les centres depuis le service
   */
  getCentres(): void {
    this.centreService.getAllCentres().subscribe(
      (data) => {
        this.centre = data;
      },
      (error) => {
        console.error('Erreur lors du chargement des centres', error);
      }
    );
  }

  /**
   * Récupère les gérants disponibles pour les centres
   */
  getAvailableManagers(): void {
    this.centreService.getAvailableManagers().subscribe({
      next: (managers: Users[]) => {
        this.managers = managers;
      },
      error: (error) => {
        console.error('Erreur chargement gérants', error);
        alert('Impossible de charger la liste des gérants. Veuillez réessayer plus tard.');
      },
    });
  }
  //#endregion

  //#region Gestion de la soumission du formulaire
  /**
   * Soumet le formulaire de création de centre
   */
  onSubmit(): void {
    if (this.centreForm.valid) {
      this.isSubmitting = true;
      const formValue = this.centreForm.value;

      const centreData = this.prepareCentreData(formValue);

      this.centreService.createCentre(centreData).subscribe({
        next: () => this.handleCreateSuccess(),
        error: (error) => this.handleCreateError(error),
      });
    } else {
      this.showNotification('error', 'Veuillez remplir correctement tous les champs obligatoires');
      this.centreForm.markAllAsTouched();
    }
  }

  /**
   * Prépare les données du centre pour l'API
   */
  prepareCentreData(formValue: any): any {
    const centreData: any = {
      name: formValue.name.trim(),
      location: formValue.location.trim(),
      isActive: Boolean(formValue.isActive)
    };

    // N'ajoutez les champs owner que si un gérant est sélectionné
    if (formValue.ownerId && formValue.ownerId !== 'null' && formValue.ownerId !== '') {
      const selectedManager = this.managers.find(m => m.id === formValue.ownerId.toString());
      if (selectedManager) {
        centreData.ownerId = formValue.ownerId;
        centreData.ownerName = `${selectedManager.firstName} ${selectedManager.lastName}`.trim();
      }
    }
    // Si le gérant n'est pas sélectionné, on laisse ownerId et ownerName non définis
    else {
      centreData.ownerId = null;
      centreData.ownerName = '';
    }
    return centreData;
  }

  /**
   * Gère le succès de la création du centre
   */
  private handleCreateSuccess(): void {
    this.isSubmitting = false;
    this.showNotification('success', 'Centre créé avec succès!');
    setTimeout(() => this.router.navigate(['/admin/centres-list']), 1500);
  }

  /**
   * Gère les erreurs lors de la création du centre
   */
  private handleCreateError(error: any): void {
    this.isSubmitting = false;
    this.showNotification('error', error.error?.message || 'Échec de la création du centre');
  }
  //#endregion

  //#region Gestion des gérants
  /**
   * Compare les managers pour le select (Angular)
   */
  compareManagers = (o1: any, o2: any): boolean => {
    return String(o1) === String(o2);
  };

  /**
   * Gère le changement de sélection du gérant
   */
  onManagerChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedValue = selectElement.value === 'null' ? null : selectElement.value;

    this.centreForm.patchValue({
        ownerId: selectedValue
    });
}

  /**
   * Met à jour le nom du propriétaire dans le formulaire
   */
  private updateOwnerName(managerId: string): void {
    const selectedManager = this.managers.find(
      (m) => String(m.id) === managerId
    );

    if (selectedManager) {
      const ownerName =
        `${selectedManager.firstName || ''} ${
          selectedManager.lastName || ''
        }`.trim() ||
        selectedManager.email ||
        'Nom non disponible';

      this.centreForm.patchValue({
        ownerName: ownerName,
      });
    }
  }
  //#endregion

  //#region Utilitaires d'affichage
  /**
   * Retourne le nom complet de l'utilisateur connecté
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
   * Convertit un ID de rôle en nom lisible
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
  //#endregion

  //#region Gestion des notifications
  /**
   * Affiche une notification
   */
  showNotification(type: 'success' | 'error', message: string) {
    this.notification = {
      show: true,
      type,
      message
    };

    setTimeout(() => this.hideNotification(), 5000);
  }

  /**
   * Masque la notification
   */
  hideNotification() {
    this.notification.show = false;
  }
  //#endregion

  //#region Gestion de l'authentification
  /**
   * Déconnecte l'utilisateur et redirige vers la page de connexion
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

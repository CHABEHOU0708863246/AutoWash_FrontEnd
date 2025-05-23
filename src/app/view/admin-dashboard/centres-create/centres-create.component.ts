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
  centre: Centres[] = []; // Liste des centres.
  centreForm!: FormGroup; // Formulaire pour créer un centre.
  currentStep: number = 1; // Étape actuelle dans le processus de création.
  managers: Users[] = [];
  isSubmitting = false;
  notification: Notification = {
    show: false,
    type: null,
    message: ''
  };

  constructor(
    private router: Router, // Service Angular pour gérer la navigation.
    private centreService: CentresService, // Service pour interagir avec les utilisateurs.
    private authService: AuthService, // Service pour gérer l'authentification.
    private formBuilder: FormBuilder // Service pour construire des formulaires réactifs.
  ) {
    // Initialisation du formulaire avec validation.
    this.centreForm = this.formBuilder.group({
      name: ['', Validators.required],
      location: ['', Validators.required],
      ownerId: ['', Validators.required], // Assurez-vous que c'est bien une string
      isActive: [true],
      ownerName: [''],
    });
  }

  /**
   * Réinitialise le formulaire.
   */
  initializeForm(): void {
    this.centreForm.reset({
      isActive: true, // Valeur par défaut
    });
  }

  /**
   * Méthode exécutée lors de l'initialisation du composant.
   */
  ngOnInit(): void {
    this.getCentres(); // Charge tous les utilisateurs.
    this.initializeForm(); // Réinitialise le formulaire.
    this.getAvailableManagers();
  }

  /**
   * Récupère les gérants disponibles
   */
  getAvailableManagers(): void {
    this.centreService.getAvailableManagers().subscribe({
      next: (managers: Users[]) => {
        this.managers = managers;
        console.log('Gérants chargés:', this.managers);

        // Debug: Affiche le premier manager pour vérification
        if (this.managers.length > 0) {
          console.log('Exemple de manager:', {
            id: this.managers[0].id,
            type: typeof this.managers[0].id,
            name: `${this.managers[0].firstName} ${this.managers[0].lastName}`,
          });
        }
      },
      error: (error) => {
        console.error('Erreur chargement gérants', error);
        // Message plus explicite pour l'utilisateur
        alert(
          'Impossible de charger la liste des gérants. Veuillez réessayer plus tard.'
        );
      },
    });
  }

  /**
   * Récupère tous les utilisateurs depuis le service.
   */
  getCentres(): void {
    this.centreService.getAllCentres().subscribe(
      (data) => {
        this.centre = data;
      },
      (error) => {
        console.error('Erreur lors du chargement des utilisateurs', error);
      }
    );
  }

// Méthode pour afficher les notifications
  showNotification(type: 'success' | 'error', message: string) {
    this.notification = {
      show: true,
      type,
      message
    };

    // Disparaît automatiquement après 5 secondes
    setTimeout(() => this.hideNotification(), 5000);
  }

  hideNotification() {
    this.notification.show = false;
  }

  // Modifiez votre méthode onSubmit
  onSubmit(): void {
    if (this.centreForm.valid) {
      this.isSubmitting = true;
      const formValue = this.centreForm.value;

      // Validation...
      if (!formValue.ownerId || formValue.ownerId.toString() === '[object Object]') {
        this.isSubmitting = false;
        this.showNotification('error', 'Veuillez sélectionner un gérant valide');
        return;
      }

      const selectedManager = this.managers.find(m => m.id === formValue.ownerId.toString());

      if (!selectedManager) {
        this.isSubmitting = false;
        this.showNotification('error', 'Gérant sélectionné introuvable');
        return;
      }

      const centreData = {
        name: formValue.name.trim(),
        location: formValue.location.trim(),
        ownerId: formValue.ownerId.toString(),
        ownerName: `${selectedManager.firstName} ${selectedManager.lastName}`.trim(),
        isActive: Boolean(formValue.isActive),
      };

      this.centreService.createCentre(centreData).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.showNotification('success', 'Centre créé avec succès!');
          setTimeout(() => this.router.navigate(['/admin/centres-list']), 1500);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.showNotification('error', error.error?.message || 'Échec de la création du centre');
        },
      });
    } else {
      this.showNotification('error', 'Veuillez remplir correctement tous les champs obligatoires');
      this.centreForm.markAllAsTouched();
    }
  }

  /**
   * Méthode pour comparer les valeurs dans le select (Angular)
   */
  compareManagers = (o1: any, o2: any): boolean => {
    return String(o1) === String(o2);
  };

  /**
   * Méthode pour gérer le changement de sélection du gérant
   */
  onManagerChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedValue = selectElement.value;

    console.log('Gérant sélectionné - Valeur brute:', selectedValue);
    console.log('Type de la valeur:', typeof selectedValue);

    // FORCE la mise à jour du FormControl avec la valeur string
    this.centreForm.patchValue({
      ownerId: selectedValue, // Forcer la valeur string
    });

    console.log(
      'Valeur dans le FormControl après patch:',
      this.centreForm.get('ownerId')?.value
    );
    console.log(
      'Type dans le FormControl:',
      typeof this.centreForm.get('ownerId')?.value
    );

    // Mise à jour du nom du propriétaire automatiquement
    if (selectedValue && selectedValue !== '') {
      const selectedManager = this.managers.find(
        (m) => String(m.id) === selectedValue
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
        console.log('Nom du propriétaire mis à jour:', ownerName);
      }
    }
  }

  /**
   * Réinitialise le formulaire.
   */
  onReset(): void {
    this.centreForm.reset({
      isActive: true,
    });
  }

  /**
   * Déconnecte l'utilisateur et le redirige vers la page de connexion.
   */
  logout(): void {
    // Vérifie si l'utilisateur est bien authentifié avant de le déconnecter
    if (this.authService.isAuthenticated()) {
      try {
        // Log l'état du localStorage avant la déconnexion (pour debug)
        console.log('État du localStorage avant déconnexion:', {
          token: !!this.authService.getToken(),
          userRole: localStorage.getItem('userRole'),
          profile: localStorage.getItem('currentUserProfile'),
        });

        // Appel au service de déconnexion
        this.authService.logout();

        // Vérifie que le localStorage a bien été vidé
        console.log('État du localStorage après déconnexion:', {
          token: !!this.authService.getToken(),
          userRole: localStorage.getItem('userRole'),
          profile: localStorage.getItem('currentUserProfile'),
        });

        // Redirige vers la page de login seulement après confirmation que tout est bien déconnecté
        this.router.navigate(['/auth/login']);
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        // Fallback en cas d'erreur - force la redirection
        this.router.navigate(['/auth/login']);
      }
    } else {
      // Si l'utilisateur n'est pas authentifié, rediriger directement
      this.router.navigate(['/auth/login']);
    }
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Users } from '../../../core/models/Users/Users';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import Swal from 'sweetalert2';
import { DomSanitizer } from '@angular/platform-browser';
import { Centres } from '../../../core/models/Centres/Centres';
import { CentresService } from '../../../core/services/Centres/centres.service';

@Component({
  selector: 'app-users-create',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './users-create.component.html',
  styleUrl: './users-create.component.scss'
})
export class UsersCreateComponent implements OnInit {
users: Users[] = []; // Liste des utilisateurs.
  userForm!: FormGroup; // Formulaire pour créer un utilisateur.
  currentStep: number = 1; // Étape actuelle dans le processus de création.
  availableRoles: string[] = ['admin', 'manager', 'washer']; // Rôles disponibles pour un utilisateur.
  selectedPhoto: string | null = null; // Pour prévisualiser la photo sélectionnée
  centres: Centres[] = [];

  displayedUsers: Users[] = []; // Liste des utilisateurs affichés sur la page actuelle.
  currentUser: Users | null = null; // Utilisateur actuellement connecté.
  user: Users | null = null; // Informations sur l'utilisateur connecté.

  constructor(
    private sanitizer: DomSanitizer,
    private centresService: CentresService,
    private router: Router, // Service Angular pour gérer la navigation.
    private usersService: UsersService, // Service pour interagir avec les utilisateurs.
    private authService: AuthService, // Service pour gérer l'authentification.
    private formBuilder: FormBuilder // Service pour construire des formulaires réactifs.
  ) {
    // Initialisation du formulaire avec validation.
    this.userForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
      isEnabled: [true], // Par défaut, l'utilisateur est activé.
      workingHours: [40, [Validators.required, Validators.min(0)]], // Heures de travail valides >= 0.
      roles: [[], Validators.required], // Rôles attribués, obligatoire.
      isPartTime: [false], // Statut de travail à temps partiel.
      hireDate: [new Date(), Validators.required], // Date d'embauche, obligatoire.
      gender: ['', Validators.required], // Sexe (exemple : "Homme", "Femme").
      contractType: ['', Validators.required], // Type de contrat (exemple : "CDI", "CDD").
      numberOfChildren: [0, [Validators.min(0)]], // Nombre d'enfants, optionnel mais >= 0.
      maritalStatus: ['', Validators.required], // Statut marital (exemple : "Marié").
      residence: ['', Validators.required], // Lieu de résidence, obligatoire.
      postalAddress: ['', Validators.required], // Adresse postale, obligatoire.
      centreId: [''], // Centre assigné, optionnel
      photoUrl: [''] // URL de la photo, optionnel
    });

    this.selectedPhoto = null ; // Réinitialisation de la prévisualisation de la photo
  }



  /**
   * Méthode exécutée lors de l'initialisation du composant.
   */
  ngOnInit(): void {
    this.getUsers(); // Charge tous les utilisateurs.
    this.initializeForm(); // Réinitialise le formulaire.
    this.getUsers(); // Récupère les utilisateurs.
    this.loadCurrentUser(); // Charge l'utilisateur connecté
    this.getCentres(); // Récupère les centres disponibles
    this.loadUserPhotos(); // Charge les photos des utilisateurs

    // S'abonner aux changements de l'utilisateur connecté
    this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
      }
    });
  }


  /**
   * NOUVELLE MÉTHODE: Vérifie si le rôle "washer" est sélectionné
   * @returns true si le rôle washer est sélectionné, false sinon
   */
  isWasherRoleSelected(): boolean {
    const selectedRoles = this.userForm.get('roles')?.value || [];
    return selectedRoles.includes('washer');
  }



  /**
   * Récupère tous les centres depuis le service.
   */
  getCentres(): void {
    this.centresService.getAllCentres().subscribe({
      next: (data) => {
        this.centres = data;
        console.log('Centres chargés:', this.centres);
      },
      error: (error) => {
        console.error("Erreur lors du chargement des centres", error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur!',
          text: 'Impossible de charger la liste des centres.',
          confirmButtonText: 'Ok'
        });
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
   * Réinitialise le formulaire.
   */
  initializeForm(): void {
    this.userForm.reset(); // Réinitialise les valeurs du formulaire.
  }

  /**
   * Gère le changement de rôle sélectionné
   */
  onRoleChange(event: any): void {
    const selectedOptions = Array.from(event.target.selectedOptions, (option: any) => option.value);
    this.userForm.get('roles')?.setValue(selectedOptions);

    // Mettre à jour la validation du champ centreId en fonction du rôle sélectionné
    this.updateCentreValidation();
  }

  updateCentreValidation(): void {
    const centreIdControl = this.userForm.get('centreId');

    if (this.isWasherRoleSelected()) {
      // Si washer est sélectionné, le centre devient obligatoire
      centreIdControl?.setValidators([Validators.required]);
    } else {
      // Sinon, le centre n'est pas obligatoire
      centreIdControl?.clearValidators();
      centreIdControl?.setValue(''); // Réinitialiser la valeur
    }

    // Appliquer les nouvelles validations
    centreIdControl?.updateValueAndValidity();
  }

  /**
   * Gère la sélection de photo
   */
onPhotoSelected(event: Event): void {
  const input = event.target as HTMLInputElement;

  if (!input.files || input.files.length === 0) {
    return;
  }

  const file = input.files[0];

  // Validation du type de fichier
  if (!file.type.match(/image\/(jpeg|png|gif|jpg)/)) {
    Swal.fire({
      icon: 'error',
      title: 'Format incorrect',
      text: 'Veuillez sélectionner une image (JPEG, PNG, GIF)',
      confirmButtonText: 'Ok'
    });
    input.value = ''; // Réinitialise l'input
    return;
  }

  // Validation de la taille
  if (file.size > 2 * 1024 * 1024) {
    Swal.fire({
      icon: 'error',
      title: 'Fichier trop volumineux',
      text: 'La taille de l\'image ne doit pas dépasser 2MB',
      confirmButtonText: 'Ok'
    });
    input.value = '';
    return;
  }

  // Prévisualisation
  const reader = new FileReader();

  reader.onload = (e: ProgressEvent<FileReader>) => {
    this.selectedPhoto = e.target?.result as string;
    this.userForm.patchValue({ photoUrl: file });
    this.userForm.get('photoUrl')?.updateValueAndValidity();
  };

  reader.onerror = () => {
    console.error('Erreur de lecture du fichier');
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: 'Impossible de lire le fichier sélectionné',
      confirmButtonText: 'Ok'
    });
    input.value = '';
  };

  reader.readAsDataURL(file);
}


  /**
   * Récupère tous les utilisateurs depuis le service.
   */
  getUsers(): void {
    this.usersService.getAllUsers().subscribe(
      (data) => {
        this.users = data;
      },
      (error) => {
        console.error("Erreur lors du chargement des utilisateurs", error);
      }
    );
  }

/**
 * Soumet le formulaire pour créer un nouvel utilisateur.
 */
onSubmit(): void {
  if (this.userForm.valid) {
    // Vérifier que les mots de passe correspondent
    if (this.userForm.get('password')?.value !== this.userForm.get('confirmPassword')?.value) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur!',
        text: 'Les mots de passe ne correspondent pas.',
        confirmButtonText: 'Ok'
      });
      return;
    }

    // Préparation de l'objet utilisateur
    const formData = this.userForm.value;

    // *** CORRECTION: Créer l'objet avec tous les paramètres explicites ***
    const user = new Users(
      '', // id - sera généré par le backend
      formData.firstName,
      formData.lastName,
      formData.email,
      formData.phoneNumber,
      formData.isEnabled,
      formData.roles, // roles
      formData.workingHours,
      formData.isPartTime,
      new Date(formData.hireDate),
      formData.gender,
      formData.contractType,
      formData.numberOfChildren,
      formData.maritalStatus,
      formData.residence,
      formData.postalAddress,
      formData.centreId,
      '', // photoUrl sera géré par le backend
      formData.password, // *** IMPORTANT: Password ***
      formData.confirmPassword // *** IMPORTANT: ConfirmPassword ***
    );

    // *** ALTERNATIVE: Si le constructeur ne fonctionne pas, assignez manuellement ***
    user.password = formData.password;
    user.confirmPassword = formData.confirmPassword;

    // Debug: Vérifier que le password est bien assigné
    console.log('User object password après création:', user.password);
    console.log('User object confirmPassword après création:', user.confirmPassword);
    console.log('Form password value:', formData.password);

    // Si une photo est sélectionnée, utiliser registerUserWithPhoto
    if (this.selectedPhoto) {
      const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        const photoFile = fileInput.files[0];

        this.usersService.registerUserWithPhoto(user, photoFile).subscribe(
          (response) => {
            console.log("Utilisateur créé avec succès", response);
            this.handleSuccess();
          },
          (error) => {
            console.error("Erreur lors de la création de l'utilisateur", error);
            this.handleError();
          }
        );
      } else {
        this.registerWithoutPhoto(user);
      }
    } else {
      this.registerWithoutPhoto(user);
    }
  } else {
    // Marquer tous les champs comme touchés pour afficher les erreurs
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      control?.markAsTouched();
    });

    Swal.fire({
      icon: 'warning',
      title: 'Formulaire invalide',
      text: 'Veuillez remplir correctement tous les champs obligatoires.',
      confirmButtonText: 'Ok'
    });
  }
}

/**
 * Enregistre un utilisateur sans photo
 */
private registerWithoutPhoto(user: Users): void {
  this.usersService.registerUser(user).subscribe(
    (response) => {
      console.log("Utilisateur créé avec succès", response);
      this.handleSuccess();
    },
    (error) => {
      console.error("Erreur lors de la création de l'utilisateur", error);
      this.handleError();
    }
  );
}

/**
 * Gère le succès de la création d'utilisateur
 */
private handleSuccess(): void {
  this.initializeForm();
  this.getUsers();
  this.selectedPhoto = null;

  Swal.fire({
    icon: 'success',
    title: 'Succès!',
    text: 'Utilisateur créé avec succès!',
    confirmButtonText: 'Ok'
  });
}

/**
 * Gère les erreurs de création d'utilisateur
 */
private handleError(): void {
  Swal.fire({
    icon: 'error',
    title: 'Erreur!',
    text: 'Erreur lors de la création de l\'utilisateur.',
    confirmButtonText: 'Ok'
  });
}

  /**
   * Réinitialise le formulaire.
   */
  onReset(): void {
    this.userForm.reset();
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
          profile: localStorage.getItem('currentUserProfile')
        });

        // Appel au service de déconnexion
        this.authService.logout();

        // Vérifie que le localStorage a bien été vidé
        console.log('État du localStorage après déconnexion:', {
          token: !!this.authService.getToken(),
          userRole: localStorage.getItem('userRole'),
          profile: localStorage.getItem('currentUserProfile')
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

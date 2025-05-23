import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Users } from '../../../core/models/Users/Users';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import Swal from 'sweetalert2';

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
  availableRoles: string[] = ['admin', 'employe', 'manager', 'laveur']; // Rôles disponibles pour un utilisateur.
  selectedPhoto: string | null = null; // Pour prévisualiser la photo sélectionnée

  constructor(
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

    this.selectedPhoto = null; // Réinitialisation de la prévisualisation de la photo
  }



  /**
   * Méthode exécutée lors de l'initialisation du composant.
   */
  ngOnInit(): void {
    this.getUsers(); // Charge tous les utilisateurs.
    this.initializeForm(); // Réinitialise le formulaire.
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
   * Récupère les détails de l'utilisateur actuellement connecté.
   */

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

    // Deux approches possibles selon votre API backend:

    // APPROCHE 1: Si votre API accepte le FormData (recommandé pour les fichiers)
    if (this.selectedPhoto) {
      // Création d'un objet FormData pour l'envoi multipart
      const formDataObj = new FormData();

      // Ajout des champs textuels
      Object.keys(this.userForm.value).forEach(key => {
        // Ne pas ajouter directement photoUrl car nous allons gérer le fichier séparément
        if (key !== 'photoUrl' && key !== 'confirmPassword') {
          let value = this.userForm.get(key)?.value;

          // Formatage de la date si nécessaire
          if (key === 'hireDate' && value instanceof Date) {
            value = value.toISOString();
          }

          // Gestion spéciale pour les tableaux (comme roles)
          if (Array.isArray(value)) {
            value.forEach(item => formDataObj.append(`${key}[]`, item));
          } else {
            formDataObj.append(key, value === null ? '' : value);
          }
        }
      });

      // Ajout du mot de passe de confirmation
      formDataObj.append('confirmPassword', this.userForm.get('confirmPassword')?.value || '');

      // Récupération du fichier depuis l'input
      const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        const photoFile = fileInput.files[0];
        formDataObj.append('photo', photoFile, photoFile.name);
      }

      // Envoi du FormData à l'API
      this.usersService.registerUserWithPhoto(formDataObj).subscribe(
        (response) => {
          console.log("Utilisateur créé avec succès", response);
          this.initializeForm();
          this.getUsers();
          this.selectedPhoto = null; // Réinitialiser la prévisualisation

          Swal.fire({
            icon: 'success',
            title: 'Succès!',
            text: 'Utilisateur créé avec succès!',
            confirmButtonText: 'Ok'
          });
        },
        (error) => {
          console.error("Erreur lors de la création de l'utilisateur", error);

          Swal.fire({
            icon: 'error',
            title: 'Erreur!',
            text: 'Erreur lors de la création de l\'utilisateur.',
            confirmButtonText: 'Ok'
          });
        }
      );
    }
    // APPROCHE 2: Si votre API accepte du JSON avec la photo en base64
    else {
      // Préparation de l'objet utilisateur
      const formData = this.userForm.value;

      // Conversion de la photo en base64 si nécessaire
      let photoUrl = formData.photoUrl;
      if (this.selectedPhoto && typeof this.selectedPhoto === 'string') {
        // Si selectedPhoto est déjà une chaîne base64, l'utiliser directement
        photoUrl = this.selectedPhoto;
      }

      const user = new Users(
        '', // l'ID sera généré par le backend
        formData.firstName,
        formData.lastName,
        formData.email,
        formData.phoneNumber,
        formData.isEnabled,
        formData.roles,
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
        photoUrl, // Utiliser la photo en base64
        formData.password,
        formData.confirmPassword // Ajout du champ confirmPassword
      );

      this.usersService.registerUser(user).subscribe(
        (response) => {
          console.log("Utilisateur créé avec succès", response);
          this.initializeForm();
          this.getUsers();
          this.selectedPhoto = null; // Réinitialiser la prévisualisation

          Swal.fire({
            icon: 'success',
            title: 'Succès!',
            text: 'Utilisateur créé avec succès!',
            confirmButtonText: 'Ok'
          });
        },
        (error) => {
          console.error("Erreur lors de la création de l'utilisateur", error);

          Swal.fire({
            icon: 'error',
            title: 'Erreur!',
            text: 'Erreur lors de la création de l\'utilisateur.',
            confirmButtonText: 'Ok'
          });
        }
      );
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

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
  //#region Propriétés
  users: Users[] = []; // Liste des utilisateurs
  userForm!: FormGroup; // Formulaire de création d'utilisateur
  currentStep: number = 1; // Étape actuelle dans le processus
  availableRoles: string[] = ['admin', 'manager', 'washer']; // Rôles disponibles
  selectedPhoto: string | null = null; // Photo sélectionnée pour prévisualisation
  centres: Centres[] = []; // Liste des centres disponibles

  displayedUsers: Users[] = []; // Utilisateurs affichés
  currentUser: Users | null = null; // Utilisateur actuellement connecté
  user: Users | null = null; // Information de l'utilisateur
  //#endregion

  //#region Constructeur
  constructor(
    private sanitizer: DomSanitizer,
    private centresService: CentresService,
    private router: Router,
    private usersService: UsersService,
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {
    this.initializeForm();
  }
  //#endregion

  //#region Méthodes du cycle de vie
  ngOnInit(): void {
    this.getUsers();
    this.loadCurrentUser();
    this.getCentres();
    this.loadUserPhotos();

    this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
      }
    });
  }
  //#endregion

  //#region Initialisation du formulaire
  private initializeForm(): void {
    this.userForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
      isEnabled: [true],
      workingHours: [40, [Validators.required, Validators.min(0)]],
      roles: [[], Validators.required],
      isPartTime: [false],
      hireDate: [new Date(), Validators.required],
      gender: ['', Validators.required],
      contractType: ['', Validators.required],
      numberOfChildren: [0, [Validators.min(0)]],
      maritalStatus: ['', Validators.required],
      residence: ['', Validators.required],
      postalAddress: ['', Validators.required],
      centreId: [''],
      photoUrl: [''],
      photoFile: [null]
    });

    this.selectedPhoto = null;
  }
  //#endregion

  //#region Gestion des rôles
  isWasherRoleSelected(): boolean {
    const selectedRoles = this.userForm.get('roles')?.value || [];
    return selectedRoles.includes('washer');
  }

  onRoleChange(event: any): void {
    const selectedOptions = Array.from(event.target.selectedOptions, (option: any) => option.value);
    this.userForm.get('roles')?.setValue(selectedOptions);
    this.updateCentreValidation();
  }

  private updateCentreValidation(): void {
    const centreIdControl = this.userForm.get('centreId');

    if (this.isWasherRoleSelected()) {
      centreIdControl?.setValidators([Validators.required]);
    } else {
      centreIdControl?.clearValidators();
      centreIdControl?.setValue('');
    }

    centreIdControl?.updateValueAndValidity();
  }
  //#endregion

  //#region Gestion des photos
  onPhotoSelected(event: Event): void {
  const input = event.target as HTMLInputElement;

  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];

  if (!file.type.match(/image\/(jpeg|png|gif|jpg)/)) {
    this.showPhotoError('Format incorrect', 'Veuillez sélectionner une image (JPEG, PNG, GIF)');
    input.value = '';
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    this.showPhotoError('Fichier trop volumineux', 'La taille de l\'image ne doit pas dépasser 2MB');
    input.value = '';
    return;
  }

  this.previewPhoto(file, input);
}

  private showPhotoError(title: string, text: string): void {
    Swal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonText: 'Ok'
    });
  }

  previewPhoto(file: File, input: HTMLInputElement): void {
  const reader = new FileReader();

  reader.onload = (e: ProgressEvent<FileReader>) => {
    this.selectedPhoto = e.target?.result as string;
    // CORRECTION : Stocker le fichier dans une propriété séparée
    this.userForm.patchValue({
      photoFile: file,  // Pour le fichier physique
      photoUrl: ''      // Réinitialiser photoUrl
    });
    this.userForm.get('photoFile')?.updateValueAndValidity();
  };

  reader.onerror = () => {
    console.error('Erreur de lecture du fichier');
    this.showPhotoError('Erreur', 'Impossible de lire le fichier sélectionné');
    input.value = '';
  };

  reader.readAsDataURL(file);
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
  //#endregion

  //#region Gestion des centres
  getCentres(): void {
    this.centresService.getAllCentres().subscribe({
      next: (data) => {
        this.centres = data;
        console.log('Centres chargés:', this.centres);
      },
      error: (error) => {
        console.error("Erreur lors du chargement des centres", error);
        this.showError('Erreur!', 'Impossible de charger la liste des centres.');
      }
    });
  }
  //#endregion

  //#region Gestion des utilisateurs
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

  onSubmit(): void {
    if (this.userForm.valid) {
      if (this.userForm.get('password')?.value !== this.userForm.get('confirmPassword')?.value) {
        this.showError('Erreur!', 'Les mots de passe ne correspondent pas.');
        return;
      }

      this.processUserCreation();
    } else {
      this.markFormAsTouched();
      this.showWarning('Formulaire invalide', 'Veuillez remplir correctement tous les champs obligatoires.');
    }
  }

  processUserCreation(): void {
  const formData = this.userForm.value;
  const user = new Users(
    '',
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
    '', // photoUrl sera définie par le backend
    formData.photoFile, // Le fichier photo
    '', // photoUrl vide initialement
    formData.password,
    formData.confirmPassword
  );

  if (this.selectedPhoto) {
    this.registerUserWithPhoto(user);
  } else {
    this.registerWithoutPhoto(user);
  }
}

  registerUserWithPhoto(user: Users): void {
  const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
  if (fileInput?.files?.[0]) {
    const photoFile = fileInput.files[0];

    this.usersService.registerUserWithPhoto(user, photoFile).subscribe({
      next: (response) => {
        console.log("Utilisateur créé avec succès", response);
        this.handleSuccess();
        // CORRECTION : Actualiser la liste des utilisateurs après création
        this.refreshUsersList();
      },
      error: (error) => {
        console.error("Erreur lors de la création de l'utilisateur", error);
        this.handleError();
      }
    });
  } else {
    this.registerWithoutPhoto(user);
  }
}

refreshUsersList(): void {
  this.getUsers();
  // Attendre que les données soient chargées avant de charger les photos
  setTimeout(() => {
    this.loadUserPhotos();
  }, 500);
}

  registerWithoutPhoto(user: Users): void {
  this.usersService.registerUser(user).subscribe({
    next: (response) => {
      console.log("Utilisateur créé avec succès", response);
      this.handleSuccess();
      // CORRECTION : Actualiser la liste des utilisateurs après création
      this.refreshUsersList();
    },
    error: (error) => {
      console.error("Erreur lors de la création de l'utilisateur", error);
      this.handleError();
    }
  });
}
  //#endregion

  //#region Gestion de l'utilisateur courant
  private loadCurrentUser(): void {
    this.authService.loadCurrentUserProfile().subscribe({
      next: (user) => {
        if (user) {
          this.currentUser = user;
          this.loadCurrentUserPhoto();
        } else {
          this.loadUserFromService();
        }
      },
      error: () => {
        this.loadUserFromService();
      },
    });
  }

  private loadUserFromService(): void {
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

  private loadCurrentUserPhoto(): void {
    if (!this.currentUser) return;

    if (this.currentUser.photoUrl && typeof this.currentUser.photoUrl === 'string') {
      this.usersService.getUserPhoto(this.currentUser.photoUrl).subscribe({
        next: (blob) => this.processUserPhoto(blob),
        error: () => this.setDefaultPhoto()
      });
    } else {
      this.setDefaultPhoto();
    }
  }

  private processUserPhoto(blob: Blob): void {
    const reader = new FileReader();
    reader.onload = () => {
      this.currentUser!.photoSafeUrl =
        this.sanitizer.bypassSecurityTrustUrl(reader.result as string);
    };
    reader.readAsDataURL(blob);
  }

  private setDefaultPhoto(): void {
    this.currentUser!.photoSafeUrl = this.sanitizer.bypassSecurityTrustUrl(
      'assets/images/default-avatar.png'
    );
  }

  getFullName(): string {
    if (this.currentUser) {
      const firstName = this.currentUser.firstName || '';
      const lastName = this.currentUser.lastName || '';
      return `${firstName} ${lastName}`.trim() || 'Utilisateur';
    }
    return 'Utilisateur';
  }

  getUserRole(): string {
    if (!this.currentUser) return 'Rôle non défini';

    if (this.currentUser.roles && this.currentUser.roles.length > 0) {
      return this.mapRoleIdToName(this.currentUser.roles[0]);
    }

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
  //#endregion

  //#region Méthodes utilitaires
  private markFormAsTouched(): void {
    Object.keys(this.userForm.controls).forEach(key => {
      this.userForm.get(key)?.markAsTouched();
    });
  }

  private handleSuccess(): void {
    this.initializeForm();
    this.getUsers();
    this.selectedPhoto = null;
    this.showSuccess('Succès!', 'Utilisateur créé avec succès!');
  }

  private handleError(): void {
    this.showError('Erreur!', 'Erreur lors de la création de l\'utilisateur.');
  }

  private showSuccess(title: string, text: string): void {
    Swal.fire({
      icon: 'success',
      title,
      text,
      confirmButtonText: 'Ok'
    });
  }

  private showError(title: string, text: string): void {
    Swal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonText: 'Ok'
    });
  }

  private showWarning(title: string, text: string): void {
    Swal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonText: 'Ok'
    });
  }

  onReset(): void {
    this.userForm.reset();
  }

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

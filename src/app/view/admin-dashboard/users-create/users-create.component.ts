import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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
  //#region PROPRIÉTÉS
  // ====================================================================

  // Liste des utilisateurs
  users: Users[] = [];
  displayedUsers: Users[] = [];
  currentUser: Users | null = null;
  user: Users | null = null;

  // Formulaire et données
  userForm!: FormGroup;
  availableRoles: string[] = ['admin', 'manager', 'washer'];
  centres: Centres[] = [];

  // États et interface
  currentStep: number = 1;
  selectedPhoto: string | null = null;

  // Gestion des erreurs améliorée
  serverErrors: { [key: string]: string } = {};
  isSubmitting: boolean = false;
  submitAttempted: boolean = false;

  //#endregion

  //#region CONSTRUCTEUR
  // ====================================================================

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

  //#region LIFECYCLE HOOKS
  // ====================================================================

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

  //#region INITIALISATION DU FORMULAIRE
  // ====================================================================

  private initializeForm(): void {
    this.userForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [''], // RENDU OPTIONNEL - pas de validators
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
      isEnabled: [true],
      workingHours: [40], // RENDU OPTIONNEL
      roles: [[], Validators.required],
      isPartTime: [false],
      hireDate: [''], // RENDU OPTIONNEL
      gender: ['', Validators.required],
      contractType: [''], // RENDU OPTIONNEL
      numberOfChildren: [0, [Validators.min(0)]],
      maritalStatus: ['', Validators.required],
      residence: [''], // RENDU OPTIONNEL
      postalAddress: [''], // RENDU OPTIONNEL
      centreId: [''],
      photoUrl: [''], // RENDU OPTIONNEL - pas de validators
      photoFile: [null] // RENDU OPTIONNEL - pas de validators
    });

    this.selectedPhoto = null;

    // Écouter les changements pour supprimer les erreurs serveur
    this.userForm.valueChanges.subscribe(() => {
      this.clearServerErrors();
    });
  }

  //#endregion

  //#region MÉTHODES DE GESTION D'ERREURS
  // ====================================================================

  // Obtenir le message d'erreur pour un champ
  getFieldError(fieldName: string): string | null {
    const field = this.userForm.get(fieldName);

    // Erreur serveur en priorité
    if (this.serverErrors[fieldName]) {
      return this.serverErrors[fieldName];
    }

    if (!field || !field.errors || (!field.touched && !this.submitAttempted)) {
      return null;
    }

    const errors = field.errors;

    // Messages d'erreur personnalisés par champ
    switch (fieldName) {
      case 'firstName':
      case 'lastName':
        if (errors['required']) return `Le ${fieldName === 'firstName' ? 'prénom' : 'nom'} est obligatoire`;
        if (errors['invalidName']) return 'Seules les lettres, espaces, apostrophes et tirets sont autorisés';
        if (errors['tooShort']) return 'Minimum 2 caractères requis';
        break;

      case 'email':
        if (errors['required']) return 'L\'adresse email est obligatoire';
        if (errors['email'] || errors['invalidEmailFormat']) return 'Format d\'email invalide (exemple: nom@domaine.com)';
        break;

      case 'phoneNumber':
        if (errors['required']) return 'Le numéro de téléphone est obligatoire';
        if (errors['invalidPhone']) return 'Format invalide (ex: +225 01 02 03 04 05 ou 01 02 03 04 05)';
        break;

      case 'password':
        if (errors['required']) return 'Le mot de passe est obligatoire';
        if (errors['tooShort']) return 'Le mot de passe doit contenir au moins 8 caractères';
        if (errors['missingUppercase']) return 'Le mot de passe doit contenir au moins une majuscule';
        if (errors['missingLowercase']) return 'Le mot de passe doit contenir au moins une minuscule';
        if (errors['missingNumber']) return 'Le mot de passe doit contenir au moins un chiffre';
        if (errors['missingSpecialChar']) return 'Le mot de passe doit contenir au moins un caractère spécial';
        break;

      case 'confirmPassword':
        if (errors['required']) return 'Veuillez confirmer votre mot de passe';
        if (errors['passwordMismatch']) return 'Les mots de passe ne correspondent pas';
        break;

      case 'hireDate':
        if (errors['required']) return 'La date d\'embauche est obligatoire';
        if (errors['tooFarInFuture']) return 'La date ne peut pas être supérieure à un an dans le futur';
        break;

      case 'photoFile':
        if (errors['fileTooLarge']) return 'La photo ne doit pas dépasser 5MB';
        if (errors['invalidFileType']) return 'Seuls les formats JPEG, PNG, GIF et WebP sont acceptés';
        break;

      case 'workingHours':
        if (errors['min']) return 'Le nombre d\'heures doit être supérieur à 0';
        if (errors['max']) return 'Le nombre d\'heures ne peut pas dépasser 60 par semaine';
        break;

      case 'numberOfChildren':
        if (errors['min']) return 'Le nombre d\'enfants ne peut pas être négatif';
        if (errors['max']) return 'Veuillez vérifier le nombre d\'enfants saisi';
        break;

      default:
        if (errors['required']) return 'Ce champ est obligatoire';
        break;
    }

    return 'Erreur de validation';
  }

  // Vérifier si un champ a une erreur
  hasFieldError(fieldName: string): boolean {
    return this.getFieldError(fieldName) !== null;
  }

  // Effacer les erreurs serveur
  clearServerErrors(): void {
    this.serverErrors = {};
  }

  // Traiter les erreurs de réponse du serveur
  handleServerErrors(error: any): void {
    this.isSubmitting = false;

    if (error.error && error.error.errors) {
      // Erreurs de validation du serveur
      const serverErrors = error.error.errors;

      for (const [field, messages] of Object.entries(serverErrors)) {
        if (Array.isArray(messages) && messages.length > 0) {
          this.serverErrors[field] = messages[0];
        }
      }

      this.showErrorToast('Erreurs de validation', 'Veuillez corriger les erreurs signalées');
    } else if (error.error && error.error.message) {
      // Erreur générale avec message
      const message = error.error.message;

      // Traiter les messages d'erreur spécifiques
      if (message.includes('email') && message.includes('already exists')) {
        this.serverErrors['email'] = 'Cette adresse email est déjà utilisée';
        this.showErrorToast('Email existant', 'Cette adresse email est déjà utilisée par un autre utilisateur');
      } else if (message.includes('phone') && message.includes('already exists')) {
        this.serverErrors['phoneNumber'] = 'Ce numéro de téléphone est déjà utilisé';
        this.showErrorToast('Téléphone existant', 'Ce numéro de téléphone est déjà utilisé par un autre utilisateur');
      } else {
        this.showErrorToast('Erreur', message);
      }
    } else {
      // Erreur générique
      this.showErrorToast('Erreur serveur', 'Une erreur inattendue s\'est produite. Veuillez réessayer.');
    }
  }

  // Afficher une notification d'erreur
  showErrorToast(title: string, message: string): void {
    Swal.fire({
      icon: 'error',
      title: title,
      text: message,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 5000,
      timerProgressBar: true,
      background: '#fff3cd',
      color: '#856404'
    });
  }

  // Afficher une notification de succès
  showSuccessToast(title: string, message: string): void {
    Swal.fire({
      icon: 'success',
      title: title,
      text: message,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  }

  //#endregion

  //#region VALIDATEURS PERSONNALISÉS
  // ====================================================================

  // Validateur pour les noms (pas de chiffres, caractères spéciaux minimaux)
  nameValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
    if (!nameRegex.test(control.value)) {
      return { invalidName: true };
    }

    if (control.value.length < 2) {
      return { tooShort: true };
    }

    return null;
  }

  // Validateur d'email amélioré
  emailFormatValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(control.value)) {
      return { invalidEmailFormat: true };
    }

    return null;
  }

  // Validateur de téléphone
  phoneValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const phoneRegex = /^(\+225|0)[0-9\s-]{8,}$/;
    if (!phoneRegex.test(control.value.replace(/\s/g, ''))) {
      return { invalidPhone: true };
    }

    return null;
  }

  // Validateur de mot de passe renforcé
  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const password = control.value;
    const errors: any = {};

    if (password.length < 8) {
      errors.tooShort = true;
    }

    if (!/[A-Z]/.test(password)) {
      errors.missingUppercase = true;
    }

    if (!/[a-z]/.test(password)) {
      errors.missingLowercase = true;
    }

    if (!/[0-9]/.test(password)) {
      errors.missingNumber = true;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.missingSpecialChar = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  // Validateur pour vérifier que les mots de passe correspondent
  passwordMatchValidator(formGroup: AbstractControl): ValidationErrors | null {
    const password = formGroup.get('password');
    const confirmPassword = formGroup.get('confirmPassword');

    if (!password || !confirmPassword) return null;

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    if (confirmPassword.hasError('passwordMismatch')) {
      delete confirmPassword.errors?.['passwordMismatch'];
      confirmPassword.updateValueAndValidity({ onlySelf: true });
    }

    return null;
  }

  // Validateur pour la date d'embauche (pas dans le futur lointain)
  futureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const selectedDate = new Date(control.value);
    const today = new Date();
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(today.getFullYear() + 1);

    if (selectedDate > maxFutureDate) {
      return { tooFarInFuture: true };
    }

    return null;
  }

  // Validateur pour la photo
  photoValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const file = control.value;
    if (file instanceof File) {
      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return { fileTooLarge: true };
      }

      // Vérifier le type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return { invalidFileType: true };
      }
    }

    return null;
  }

  //#endregion

  //#region GESTION DES RÔLES
  // ====================================================================

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

  //#region GESTION DES PHOTOS
  // ====================================================================

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      // Réinitialiser la preview si aucun fichier
      this.selectedPhoto = null;
      return;
    }

    const file = input.files[0];

    // Validation du type de fichier
    if (!file.type.match(/image\/(jpeg|png|gif|jpg)/)) {
      this.showPhotoError('Format incorrect', 'Veuillez sélectionner une image (JPEG, PNG, GIF)');
      input.value = '';
      this.selectedPhoto = null; // Réinitialiser la preview
      return;
    }

    // Validation de la taille
    if (file.size > 2 * 1024 * 1024) {
      this.showPhotoError('Fichier trop volumineux', 'La taille de l\'image ne doit pas dépasser 2MB');
      input.value = '';
      this.selectedPhoto = null; // Réinitialiser la preview
      return;
    }

    // Prévisualiser la photo
    this.previewPhoto(file);
  }

  private showPhotoError(title: string, text: string): void {
    Swal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonText: 'Ok'
    });
  }

  previewPhoto(file: File): void {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      // CORRECTION : Mettre à jour selectedPhoto pour l'affichage
      this.selectedPhoto = e.target?.result as string;

      // Mettre à jour le formulaire
      this.userForm.patchValue({
        photoFile: file,  // Pour le fichier physique
        photoUrl: ''      // Réinitialiser photoUrl
      });

      // Déclencher la validation
      this.userForm.get('photoFile')?.updateValueAndValidity();
    };

    reader.onerror = () => {
      console.error('Erreur de lecture du fichier');
      this.selectedPhoto = null; // Réinitialiser en cas d'erreur
      this.showPhotoError('Erreur', 'Impossible de lire le fichier sélectionné');
    };

    reader.readAsDataURL(file);
  }

  removeSelectedPhoto(): void {
    this.selectedPhoto = null;
    this.userForm.patchValue({
      photoFile: null,
      photoUrl: ''
    });

    // Réinitialiser l'input file
    const photoInput = document.getElementById('photo-upload') as HTMLInputElement;
    if (photoInput) {
      photoInput.value = '';
    }
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

  //#region GESTION DES CENTRES
  // ====================================================================

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

  //#region GESTION DES UTILISATEURS
  // ====================================================================

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
      formData.phoneNumber || '', // Utilise une chaîne vide si null/undefined
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
      formData.photoFile, // Le fichier photo (peut être null)
      '', // photoUrl vide initialement
      formData.password,
      formData.confirmPassword
    );

    // Vérifier s'il y a une photo sélectionnée
    if (this.selectedPhoto && formData.photoFile) {
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
        this.refreshUsersList();
      },
      error: (error) => {
        console.error("Erreur lors de la création de l'utilisateur", error);
        this.handleError();
      }
    });
  }

  //#endregion

  //#region GESTION DE L'UTILISATEUR COURANT
  // ====================================================================

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

  //#region MÉTHODES UTILITAIRES
  // ====================================================================

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

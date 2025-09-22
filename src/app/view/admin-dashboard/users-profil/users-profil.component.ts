import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { Users } from '../../../core/models/Users/Users';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { UserEditableFields } from '../../../core/models/Users/UserEditableFields';
import { UpdateProfileRequest } from '../../../core/models/Users/UpdateProfileRequest';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-users-profil',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './users-profil.component.html',
  styleUrl: './users-profil.component.scss',
})
export class UsersProfilComponent implements OnInit {
  users: Users[] = []; // Liste complète des utilisateurs.
  displayedUsers: Users[] = []; // Liste des utilisateurs affichés sur la page actuelle.
  currentUser: Users | null = null; // Utilisateur actuellement connecté.
  user: Users | null = null; // Informations sur l'utilisateur connecté.
  isSidebarCollapsed = false;

  // Propriétés pour la gestion du profil
  userEditableFields: UserEditableFields | null = null;
  selectedPhotoFile: File | null = null;
  isLoading = false;
  updateMessage = '';
  updateMessageType: 'success' | 'error' | '' = '';

  // Propriétés du formulaire
  profileForm = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    gender: '',
    maritalStatus: '',
    numberOfChildren: null as number | null,
    residence: '',
    postalAddress: '',
    contractType: '',
    centreId: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  };

  // Onglet actif
  activeTab: 'personal' | 'professional' | 'security' = 'personal';

  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService, // Service pour interagir avec les utilisateurs.
    private router: Router, // Service pour la navigation entre les routes.
    private authService: AuthService // Service pour gérer l'authentification.
  ) {}

  ngOnInit(): void {
    this.getUsers(); // Récupère les utilisateurs.
    this.loadCurrentUser(); // Charge l'utilisateur connecté
    this.loadUserProfile(); // Charge les informations du profil utilisateur

    // S'abonner aux changements de l'utilisateur connecté
    this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
      }
    });
  }

  /**
   * Initialise les événements DOM après que la vue soit complètement initialisée.
   */
  ngAfterViewInit(): void {
    // Délai pour s'assurer que le DOM est prêt
    setTimeout(() => {
      this.initializeDOMEvents();
    }, 100);
  }

  /**
   * Charge les informations du profil utilisateur et les champs modifiables
   */
  loadUserProfile(): void {
    this.usersService.getProfile().subscribe({
      next: (userFields: UserEditableFields) => {
        this.userEditableFields = userFields;
        if (userFields.currentUser) {
          this.populateForm(userFields.currentUser);
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement du profil:', error);
        this.showMessage('Erreur lors du chargement du profil', 'error');
      },
    });
  }

  /**
   * Remplit le formulaire avec les données utilisateur
   */
  private populateForm(user: Users): void {
    this.profileForm = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      gender: user.gender || '',
      maritalStatus: user.maritalStatus || '',
      numberOfChildren: user.numberOfChildren || null,
      residence: user.residence || '',
      postalAddress: user.postalAddress || '',
      contractType: user.contractType || '',
      centreId: user.centreId || '',
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    };

    // ✅ Charger la photo de profil si elle existe
    if (user.photoUrl) {
      this.loadUserProfilePhoto(user.photoUrl.toString());
    }
  }

  private loadUserProfilePhoto(photoUrl: string): void {
    this.usersService.getUserPhoto(photoUrl).subscribe({
      next: (photoBlob: Blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          const profilePhoto = document.getElementById('profilePhoto');
          if (profilePhoto && reader.result) {
            profilePhoto.style.backgroundImage = `url(${reader.result})`;
            profilePhoto.style.backgroundSize = 'cover';
            profilePhoto.style.backgroundPosition = 'center';
            profilePhoto.innerHTML = ''; // Enlever l'icône par défaut
          }
        };
        reader.readAsDataURL(photoBlob);
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la photo:', error);
      },
    });
  }

  /**
   *  Active un onglet spécifique dans l'interface utilisateur.
   * @param tab L'onglet à activer ('personal', 'professional', 'security').
   */
  setActiveTab(tab: 'personal' | 'professional' | 'security'): void {
    this.activeTab = tab;
  }

  /**
   * Initialise les événements DOM
   */
  private initializeDOMEvents(): void {
    // Gestion des onglets
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        tabButtons.forEach((b) => b.classList.remove('active'));
        tabContents.forEach((c) => c.classList.remove('active'));

        btn.classList.add('active');
        tabContents[index]?.classList.add('active');

        // Mettre à jour l'onglet actif
        const tabs = ['personal', 'professional', 'security'] as const;
        this.activeTab = tabs[index] || 'personal';
      });
    });

    // Gestion de l'upload de photo
    const photoInput = document.getElementById(
      'photoInput'
    ) as HTMLInputElement;
    const photoUploadBtn = document.querySelector('.photo-upload-btn');

    if (photoUploadBtn) {
      photoUploadBtn.addEventListener('click', () => {
        photoInput?.click();
      });
    }

    if (photoInput) {
      photoInput.addEventListener('change', (event) => {
        this.handlePhotoChange(event);
      });
    }

    // Gestion de la soumission du formulaire
    const form = document.getElementById('userForm') as HTMLFormElement;
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        this.onSubmit();
      });
    }
  }

  /**
   * Gère le changement de photo
   */
  handlePhotoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.selectedPhotoFile = file;

      // Prévisualisation de l'image
      const reader = new FileReader();
      reader.onload = (e) => {
        const profilePhoto = document.getElementById('profilePhoto');
        if (profilePhoto && e.target?.result) {
          profilePhoto.style.backgroundImage = `url(${e.target.result})`;
          profilePhoto.style.backgroundSize = 'cover';
          profilePhoto.style.backgroundPosition = 'center';
          profilePhoto.innerHTML = ''; // Enlever l'icône
        }
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Soumission du formulaire
   */
  onSubmit(): void {
    if (this.isLoading) return;

    // Validation des mots de passe
    if (
      this.profileForm.newPassword &&
      this.profileForm.newPassword !== this.profileForm.confirmNewPassword
    ) {
      this.showMessage('Les mots de passe ne correspondent pas', 'error');
      return;
    }

    this.isLoading = true;
    this.updateMessage = '';

    // ✅ Créer la requête avec les bonnes valeurs du formulaire Angular (pas du DOM)
    const updateRequest = new UpdateProfileRequest(
      this.profileForm.firstName,
      this.profileForm.lastName,
      this.profileForm.phoneNumber,
      this.profileForm.gender,
      this.profileForm.contractType,
      this.profileForm.numberOfChildren || undefined,
      this.profileForm.maritalStatus,
      this.profileForm.residence,
      this.profileForm.postalAddress,
      this.profileForm.centreId,
      this.selectedPhotoFile || undefined,
      this.profileForm.currentPassword || undefined,
      this.profileForm.newPassword || undefined,
      this.profileForm.confirmNewPassword || undefined
    );

    // Appeler le service de mise à jour
    this.usersService.updateProfile(updateRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.showMessage('Profil mis à jour avec succès!', 'success');

        // Réinitialiser les champs de mot de passe
        this.profileForm.currentPassword = '';
        this.profileForm.newPassword = '';
        this.profileForm.confirmNewPassword = '';
        this.clearPasswordFields();

        // ✅ Recharger le profil pour avoir les données à jour
        this.loadUserProfile();

        // ✅ Mettre à jour l'affichage immédiatement
        this.updateProfileDisplay();
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Erreur lors de la mise à jour:', error);
        this.showMessage(
          error.message || 'Erreur lors de la mise à jour du profil',
          'error'
        );
      },
    });
  }

  private updateProfileDisplay(): void {
    if (this.userEditableFields?.currentUser) {
      // Mettre à jour le nom affiché en haut
      const profileNameElement = document.getElementById('profileName');
      if (profileNameElement) {
        profileNameElement.textContent = `${
          this.userEditableFields.currentUser.firstName || 'Prénom'
        } ${this.userEditableFields.currentUser.lastName || 'Nom'}`;
      }

      // Mettre à jour d'autres éléments d'affichage si nécessaire
      const workingHoursElement = document.getElementById(
        'workingHoursDisplay'
      );
      if (workingHoursElement) {
        workingHoursElement.textContent =
          this.userEditableFields.currentUser.workingHours?.toString() || '40';
      }
    }
  }

  /**
   * Efface les champs de mot de passe
   */
  private clearPasswordFields(): void {
    const passwordFields = ['currentPassword', 'password', 'confirmPassword'];
    passwordFields.forEach((id) => {
      const element = document.getElementById(id) as HTMLInputElement;
      if (element) element.value = '';
    });
  }

  /**
   * Affiche un message de succès ou d'erreur
   */
  private showMessage(message: string, type: 'success' | 'error'): void {
    this.updateMessage = message;
    this.updateMessageType = type;

    // Afficher le message dans le DOM
    const successElement = document.getElementById('successMessage');
    const errorElement = document.getElementById('passwordError');

    if (type === 'success' && successElement) {
      successElement.style.display = 'block';
      successElement.querySelector('span')!.textContent = message;
      setTimeout(() => {
        successElement.style.display = 'none';
      }, 5000);
    } else if (type === 'error' && errorElement) {
      errorElement.style.display = 'block';
      errorElement.querySelector('span')!.textContent = message;
      setTimeout(() => {
        errorElement.style.display = 'none';
      }, 5000);
    }
  }

  /**
   * Réinitialise le formulaire
   */
  resetForm(): void {
    if (this.userEditableFields?.currentUser) {
      this.populateForm(this.userEditableFields.currentUser);

      // ✅ Forcer la mise à jour des champs dans le DOM
      setTimeout(() => {
        this.updateDOMFields();
      }, 0);
    }

    this.selectedPhotoFile = null;
    this.updateMessage = '';
    this.updateMessageType = '';
  }

  private updateDOMFields(): void {
    const updateField = (id: string, value: any) => {
      const element = document.getElementById(id) as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement;
      if (element && value !== undefined && value !== null) {
        element.value = value.toString();
      }
    };

    // Mettre à jour tous les champs
    updateField('firstName', this.profileForm.firstName);
    updateField('lastName', this.profileForm.lastName);
    updateField('phoneNumber', this.profileForm.phoneNumber);
    updateField('gender', this.profileForm.gender);
    updateField('maritalStatus', this.profileForm.maritalStatus);
    updateField('numberOfChildren', this.profileForm.numberOfChildren);
    updateField('residence', this.profileForm.residence);
    updateField('postalAddress', this.profileForm.postalAddress);
    updateField('contractType', this.profileForm.contractType);
    updateField('centreId', this.profileForm.centreId);

    // Vider les champs de mot de passe
    this.clearPasswordFields();
  }

  /**
   * Vérifie si un champ est modifiable
   */
  canEdit(field: keyof UserEditableFields): boolean {
    return this.userEditableFields?.[field] === true;
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
   * Bascule l'état de la barre latérale entre "collapsée" et
   * "étendue".
   * Modifie les classes CSS pour ajuster l'affichage.
   * Cette méthode est appelée lors du clic sur le bouton de
   * basculement de la barre latérale.
   */
  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;

    // Ajoute/retire les classes nécessaires
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    if (sidebar && mainContent) {
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('collapsed');
    }
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
   * Déconnecte l'utilisateur et le redirige vers la page de connexion.
   */
  logout(): void {
    // Vérifie si l'utilisateur est bien authentifié avant de le déconnecter
    if (this.authService.isAuthenticated()) {
      try {
        // Log l'état du localStorage avant la déconnexion (pour debug)
        console.log('État du localStorage avant déconnexion:', {});

        // Appel au service de déconnexion
        this.authService.logout();

        // Vérifie que le localStorage a bien été vidé
        console.log('État du localStorage après déconnexion:', {});

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

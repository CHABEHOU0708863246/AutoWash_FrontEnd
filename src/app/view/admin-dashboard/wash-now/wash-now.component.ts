import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { RouterLink } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { Users } from '../../../core/models/Users/Users';
import {
  ReactiveFormsModule,
  FormsModule,
  FormGroup,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { PaymentMethod } from '../../../core/models/Payments/PaymentMethod';
import {
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  of,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { Centres } from '../../../core/models/Centres/Centres';
import { Customer } from '../../../core/models/Customer/Customer';
import { ServiceSettings } from '../../../core/models/Settings/ServiceSettings';
import { VehicleTypeSettings } from '../../../core/models/Settings/VehicleTypeSettings';
import { PriceCalculationResult } from '../../../core/models/Wash/PriceCalculationResult';
import { WashSession } from '../../../core/models/Wash/WashSession';
import { WashsService } from '../../../core/services/Washs/washs.service';
import { CreateOrUpdateCustomerRequest } from '../../../core/models/Wash/CreateOrUpdateCustomerRequest';
import { WashRegistration } from '../../../core/models/Wash/WashRegistration';
import { PaymentInfo } from '../../../core/models/Payments/PaymentInfo';

@Component({
  selector: 'app-wash-now',
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './wash-now.component.html',
  styleUrl: './wash-now.component.scss',
})
export class WashNowComponent implements OnInit {
  // Propriétés existantes
  users: Users[] = [];
  displayedUsers: Users[] = [];
  currentUser: Users | null = null;
  user: Users | null = null;
  isSidebarCollapsed = false;
  washForm!: FormGroup;

  // Nouvelles propriétés pour le service
  centres: Centres[] = [];
  services: ServiceSettings[] = [];
  vehicleTypes: VehicleTypeSettings[] = [];
  currentCustomer: Customer | null = null;
  customerHistory: WashSession[] = [];
  priceCalculation: PriceCalculationResult | null = null;

  // États de l'interface
  isLoading = false;
  isSubmitting = false;
  isCalculatingPrice = false;
  isSearchingCustomer = false;

  // Méthode de paiement sélectionnée
  selectedPaymentMethod: PaymentMethod = PaymentMethod.CASH;
  PaymentMethod = PaymentMethod; // Pour l'utiliser dans le template

  // Messages d'erreur
  errorMessages: string[] = [];
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService,
    private router: Router,
    private authService: AuthService,
    private fb: FormBuilder,
    private washsService: WashsService
  ) {
    this.initializeForm();
    this.setupFormSubscriptions();
  }

  ngOnInit(): void {
    this.loadInitialData();
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.washForm = this.fb.group({
      centreId: ['', Validators.required],
      serviceId: ['', Validators.required],
      vehicleTypeId: ['', Validators.required],
      vehiclePlate: ['', [Validators.required, Validators.minLength(4)]],
      vehicleBrand: [''],
      vehicleColor: [''],
      customerPhone: [
        '',
        [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)],
      ],
      customerName: [''],
      transactionId: [''],
      applyLoyaltyDiscount: [false],
      isAdminOverride: [false],
    });
  }

  private setupFormSubscriptions(): void {
    // Surveillance des changements du centre pour charger les services et types de véhicules
    this.washForm
      .get('centreId')
      ?.valueChanges.pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe((centreId) => {
        if (centreId) {
          this.loadServicesByCentre(centreId);
          this.loadVehicleTypesByCentre(centreId);
          this.resetPriceCalculation();
        }
      });

    // Surveillance du téléphone client pour recherche automatique
    this.washForm
      .get('customerPhone')
      ?.valueChanges.pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((phone) => {
          if (phone && phone.length >= 10) {
            return this.searchCustomerByPhone(phone);
          }
          this.currentCustomer = null;
          this.customerHistory = [];
          return EMPTY;
        })
      )
      .subscribe();

    // Surveillance des changements pour recalculer le prix
    const priceFields = [
      'serviceId',
      'vehicleTypeId',
      'customerPhone',
      'applyLoyaltyDiscount',
    ];
    priceFields.forEach((field) => {
      this.washForm
        .get(field)
        ?.valueChanges.pipe(
          takeUntil(this.destroy$),
          debounceTime(300),
          distinctUntilChanged()
        )
        .subscribe(() => this.calculatePrice());
    });
  }

  private async loadInitialData(): Promise<void> {
    this.isLoading = true;
    try {
      await this.loadActiveCentres();
    } catch (error) {
      this.handleError(
        'Erreur lors du chargement des données initiales',
        error
      );
    } finally {
      this.isLoading = false;
    }
  }

  private async loadActiveCentres(): Promise<void> {
    this.washsService
      .getActiveCentres()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.centres = response.data;
          }
        },
        error: (error) =>
          this.handleError('Erreur lors du chargement des centres', error),
      });
  }

  private async loadServicesByCentre(centreId: string): Promise<void> {
    this.washsService
      .getServicesByCentre(centreId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.services = response.data;
          }
        },
        error: (error) =>
          this.handleError('Erreur lors du chargement des services', error),
      });
  }

  private async loadVehicleTypesByCentre(centreId: string): Promise<void> {
    this.washsService
      .getVehicleTypesByCentre(centreId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.vehicleTypes = response.data;
          }
        },
        error: (error) =>
          this.handleError(
            'Erreur lors du chargement des types de véhicules',
            error
          ),
      });
  }

  private searchCustomerByPhone(phone: string) {
    this.isSearchingCustomer = true;
    return this.washsService.findCustomerByPhone(phone).pipe(
      takeUntil(this.destroy$),
      switchMap((response) => {
        this.isSearchingCustomer = false;
        if (response.success && response.data) {
          this.currentCustomer = response.data;
          this.washForm.patchValue({
            customerName: this.currentCustomer.name,
          });
          this.loadCustomerHistory(phone);
        } else {
          this.currentCustomer = null;
          this.customerHistory = [];
        }
        return of(response);
      })
    );
  }

  private loadCustomerHistory(customerPhone: string): void {
    this.washsService
      .getCustomerWashHistory(customerPhone)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.customerHistory = response.data.slice(0, 5); // Limiter à 5 derniers lavages
          }
        },
        error: (error) =>
          console.error("Erreur lors du chargement de l'historique:", error),
      });
  }

  private calculatePrice(): void {
    const { serviceId, vehicleTypeId, customerPhone } = this.washForm.value;

    if (!serviceId || !vehicleTypeId) {
      this.priceCalculation = null;
      return;
    }

    this.isCalculatingPrice = true;
    this.washsService
      .calculateFinalPrice(serviceId, vehicleTypeId, customerPhone)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isCalculatingPrice = false;
          if (response.success && response.data) {
            this.priceCalculation = response.data;
          }
        },
        error: (error) => {
          this.isCalculatingPrice = false;
          console.error('Erreur lors du calcul du prix:', error);
        },
      });
  }

  private resetPriceCalculation(): void {
    this.priceCalculation = null;
    this.washForm.patchValue({
      serviceId: '',
      vehicleTypeId: '',
    });
  }

  // Méthodes publiques pour le template
  onPaymentMethodChange(method: PaymentMethod): void {
    this.selectedPaymentMethod = method;

    // Réinitialiser la référence de transaction si passage en espèces
    if (method === PaymentMethod.CASH) {
      this.washForm.patchValue({ transactionId: '' });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.washForm.invalid) {
      this.markFormGroupTouched(this.washForm);
      return;
    }

    this.isSubmitting = true;
    this.errorMessages = [];
    this.successMessage = '';

    try {
      // 1. Valider l'enregistrement
      const validationResult = await this.validateRegistration();
      if (validationResult.length > 0) {
        this.errorMessages = validationResult;
        return;
      }

      // 2. Créer ou obtenir le client
      const customer = await this.getOrCreateCustomer();

      // 3. Préparer l'enregistrement
      const registration = this.prepareWashRegistration(customer);

      // 4. Enregistrer le lavage
      const washSession = await this.registerWash(registration);

      // 5. Enregistrer le paiement si nécessaire
      if (
        this.selectedPaymentMethod !== PaymentMethod.CASH ||
        this.washForm.value.transactionId
      ) {
        await this.registerPayment(washSession.id ? washSession.id : '');
      }

      this.successMessage = 'Lavage enregistré avec succès!';
      this.resetForm();
    } catch (error) {
      this.handleError("Erreur lors de l'enregistrement du lavage", error);
    } finally {
      this.isSubmitting = false;
    }
  }

  private async validateRegistration(): Promise<string[]> {
    const registration = this.prepareWashRegistration();

    return new Promise((resolve) => {
      this.washsService
        .validateWashRegistration(registration)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            resolve(response.success && response.data ? response.data : []);
          },
          error: () => resolve(['Erreur lors de la validation']),
        });
    });
  }

  private async getOrCreateCustomer(): Promise<Customer> {
    const { customerPhone, customerName } = this.washForm.value;

    const customerRequest: CreateOrUpdateCustomerRequest = {
      phone: customerPhone,
      name: customerName || 'Client',
      email: '',
    };

    return new Promise((resolve, reject) => {
      this.washsService
        .getOrCreateCustomer(customerRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              resolve(response.data);
            } else {
              reject(new Error('Impossible de créer/obtenir le client'));
            }
          },
          error: reject,
        });
    });
  }

  private prepareWashRegistration(customer?: Customer): WashRegistration {
    const formValue = this.washForm.value;

    const customerRequest: CreateOrUpdateCustomerRequest = {
      phone: formValue.customerPhone,
      name: formValue.customerName || 'Client',
      email: '',
    };

    return {
      centreId: formValue.centreId,
      serviceId: formValue.serviceId,
      vehicleTypeId: formValue.vehicleTypeId,
      vehiclePlate: formValue.vehiclePlate.toUpperCase(),
      vehicleBrand: formValue.vehicleBrand || '',
      vehicleColor: formValue.vehicleColor || '',
      customer: customerRequest,
      amountPaid: formValue.amountPaid || 0,
      paymentMethod: formValue.paymentMethod,
      transactionId: formValue.transactionId || '',
      applyLoyaltyDiscount: formValue.applyLoyaltyDiscount,
      isAdminOverride: formValue.isAdminOverride,
      performedByUserId: this.currentUser?.id || '',
    };
  }

  private async registerWash(
    registration: WashRegistration
  ): Promise<WashSession> {
    return new Promise((resolve, reject) => {
      this.washsService
        .registerWash(registration)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              resolve(response.data);
            } else {
              reject(new Error("Échec de l'enregistrement du lavage"));
            }
          },
          error: reject,
        });
    });
  }

  private async registerPayment(washSessionId: string): Promise<void> {
    const { transactionId, applyLoyaltyDiscount } = this.washForm.value;

    // Generate transaction reference if needed
    const transactionRef =
      transactionId || (await this.generateTransactionReference());

    // Create a proper PaymentInfo instance
    const paymentInfo = new PaymentInfo({
      method: this.selectedPaymentMethod,
      amount: this.priceCalculation?.finalPrice || 0,
      transactionId: transactionRef,
      applyLoyaltyDiscount: applyLoyaltyDiscount || false,
      receivedBy: this.currentUser?.id || '',
      discountCode: '', // Add if required
    });

    // Validate the payment before sending
    const validationErrors = paymentInfo.validate();
    if (validationErrors.length > 0) {
      return Promise.reject(new Error(validationErrors.join(', ')));
    }

    return new Promise((resolve, reject) => {
      this.washsService
        .registerPayment(washSessionId, paymentInfo)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              resolve();
            } else {
              reject(new Error("Échec de l'enregistrement du paiement"));
            }
          },
          error: reject,
        });
    });
  }

  private async generateTransactionReference(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.washsService
        .generateTransactionReference(
          this.selectedPaymentMethod,
          this.currentUser?.firstName
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              resolve(response.data);
            } else {
              reject(new Error('Impossible de générer la référence'));
            }
          },
          error: reject,
        });
    });
  }

  resetForm(): void {
    this.washForm.reset();
    this.currentCustomer = null;
    this.customerHistory = [];
    this.priceCalculation = null;
    this.selectedPaymentMethod = PaymentMethod.CASH;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((field) => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.errorMessages = [message];
    if (error?.error?.message) {
      this.errorMessages.push(error.error.message);
    }
  }

  // Getters pour le template
  get isFormValid(): boolean {
    return this.washForm.valid && this.priceCalculation !== null;
  }

  get totalPrice(): number {
    return this.priceCalculation?.finalPrice || 0;
  }

  get basePrice(): number {
    return this.priceCalculation?.basePrice || 0;
  }

  get loyaltyDiscount(): number {
    return this.priceCalculation?.loyaltyDiscount || 0;
  }

  get vehicleMultiplier(): number {
    return this.priceCalculation?.vehicleMultiplier || 1;
  }

  get canApplyLoyaltyDiscount(): boolean {
    return (
      this.currentCustomer !== null &&
      (this.currentCustomer.totalCompletedBookings || 0) >= 5
    );
  }

  get customerTotalSpent(): number {
    return this.currentCustomer?.totalAmountSpent || 0;
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

  //#region Authentification
  /**
   * Déconnecte l'utilisateur
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

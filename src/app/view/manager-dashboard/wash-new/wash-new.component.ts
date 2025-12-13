import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import {
  Subject,
  takeUntil,
  catchError,
  switchMap,
  map,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  of,
  finalize,
  tap,
  forkJoin,
  Observable,
} from 'rxjs';

// Models
import { Users } from '../../../core/models/Users/Users';
import { Centres } from '../../../core/models/Centres/Centres';
import { Customer } from '../../../core/models/Customer/Customer';
import { WashSession } from '../../../core/models/Wash/WashSession';
import { WashRegistration } from '../../../core/models/Wash/WashRegistration';
import { PaymentInfo } from '../../../core/models/Payments/PaymentInfo';
import { PriceCalculationResult } from '../../../core/models/Wash/PriceCalculationResult';
import { CreateOrUpdateCustomerRequest } from '../../../core/models/Wash/CreateOrUpdateCustomerRequest';
import { ServiceSettings } from '../../../core/models/Settings/Services/ServiceSettings';
import { VehicleTypeSettings } from '../../../core/models/Settings/Vehicles/VehicleTypeSettings';
import { PaymentMethod } from '../../../core/models/Payments/PaymentMethod';

// Services
import { AuthService } from '../../../core/services/Auth/auth.service';
import { UsersService } from '../../../core/services/Users/users.service';
import { WashsService } from '../../../core/services/Washs/washs.service';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { ServiceSettingsService } from '../../../core/services/ServiceSettings/service-settings.service';
import { VehiclesSettingsService } from '../../../core/services/VehiclesSettings/vehicles-settings.service';
import { NotificationService } from '../../../core/services/Notification/notification.service';

@Component({
  selector: 'app-wash-manager',
  imports: [RouterLink, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './wash-new.component.html',
  styleUrl: './wash-new.component.scss',
})
export class WashNewComponent implements OnInit {
  //#region Properties
  // Utilisateurs
  users: Users[] = [];
  currentUser: Users | null = null;
  isSidebarCollapsed = false;
  washForm!: FormGroup;

  // Données du centre du manager
  managerCentre: Centres | null = null;
  services: ServiceSettings[] = [];
  vehicleTypes: VehicleTypeSettings[] = [];
  washers: Users[] = [];

  // Client et historique
  currentCustomer: Customer | null = null;
  customerHistory: WashSession[] = [];
  priceCalculation: PriceCalculationResult | null = null;

  // États de l'interface
  isLoading = false;
  isSubmitting = false;
  isCalculatingPrice = false;
  isSearchingCustomer = false;

  // Méthode de paiement
  selectedPaymentMethod: PaymentMethod = PaymentMethod.CASH;
  PaymentMethod = PaymentMethod;

  // Messages
  errorMessages: string[] = [];
  successMessage = '';

  // Compteur pour génération de numéros
  private registrationCounter = 0;
  private destroy$ = new Subject<void>();
  //#endregion

  //#region Constructor
  constructor(
    private sanitizer: DomSanitizer,
    private usersService: UsersService,
    private router: Router,
    private authService: AuthService,
    private fb: FormBuilder,
    private washsService: WashsService,
    private centresService: CentresService,
    private serviceSettingsService: ServiceSettingsService,
    private vehiclesSettingsService: VehiclesSettingsService,
    private notificationService: NotificationService
  ) {
    this.initializeForm();
  }
  //#endregion

  //#region Lifecycle Hooks
  ngOnInit(): void {
    this.loadCurrentUserAndCentre();
    this.setupFormSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  //#endregion

  //#region Initialization Methods
  /**
   * Charge l'utilisateur connecté et son centre automatiquement
   */
  loadCurrentUserAndCentre(): void {
    this.isLoading = true;
    this.errorMessages = [];

    this.authService
      .loadCurrentUserProfile()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.warn(
            '⚠️ Erreur loadCurrentUserProfile, fallback vers getCurrentUser',
            error
          );
          return this.usersService.getCurrentUser();
        }),
        switchMap((user) => {
          if (!user) {
            throw new Error("Impossible de récupérer l'utilisateur connecté");
          }

          this.currentUser = user;
          this.loadCurrentUserPhoto();

          console.log('✅ Utilisateur chargé:', {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            centreId: user.centreId,
          });

          if (!user.centreId) {
            throw new Error(
              "Aucun centre assigné à cet utilisateur. Veuillez contacter l'administrateur."
            );
          }

          return this.centresService.getCentreById(user.centreId).pipe(
            map((response) => {
              // 🔧 CORRECTION : Gérer la structure de réponse de l'API
              console.log('📦 Réponse brute du centre:', response);

              let centre: Centres;

              // Type guard pour vérifier la présence d'un champ data dans la réponse
              const isApiResponseWithData = (
                obj: any
              ): obj is { success?: boolean; data?: unknown } =>
                obj && typeof obj === 'object' && 'data' in obj;

              // Si la réponse contient success et data
              if (isApiResponseWithData(response) && response.data) {
                centre = response.data as Centres;
              }
              // Si la réponse est directement le centre
              else {
                centre = response as Centres;
              }

              console.log('✅ Centre extrait:', {
                id: centre?.id,
                name: centre?.name,
                isActive: centre?.isActive,
              });

              return centre;
            }),
            tap((centre) => {
              if (!centre || !centre.id) {
                throw new Error(
                  'Centre invalide : les données sont incomplètes'
                );
              }
            })
          );
        }),
        switchMap((centre) => {
          this.managerCentre = centre;

          console.log('🏢 Centre assigné:', {
            id: this.managerCentre.id,
            name: this.managerCentre.name,
          });

          return forkJoin({
            services: this.loadServicesForCentre(centre.id!),
            vehicleTypes: this.loadVehicleTypesForCentre(centre.id!),
            washers: this.loadWashersForCentre(centre.id!),
          }).pipe(
            tap((results) => {
              console.log('✅ Données du centre chargées:', {
                services: results.services.length,
                vehicleTypes: results.vehicleTypes.length,
                washers: results.washers.length,
              });
            })
          );
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (results) => {
          console.log('✅ Initialisation complète réussie');
          this.initializeFormWithCentreData();
        },
        error: (error) => {
          console.error('❌ Erreur chargement centre manager:', error);
          this.handleError(
            error.message || 'Erreur lors du chargement de votre centre',
            error
          );
          this.isLoading = false;
        },
      });
  }

  /**
   * Charge les services du centre
   */
  loadServicesForCentre(centreId: string): Observable<ServiceSettings[]> {
    console.log('📡 Chargement des services pour le centre:', centreId);

    return this.serviceSettingsService.getServicesByCentre(centreId).pipe(
      takeUntil(this.destroy$),
      map((response) => {
        let servicesData: ServiceSettings[] = [];

        // Gérer différents formats de réponse
        if (Array.isArray(response)) {
          servicesData = response;
        } else if (
          response &&
          response.success &&
          Array.isArray(response.data)
        ) {
          servicesData = response.data;
        } else if (response && Array.isArray(response.data)) {
          servicesData = response.data;
        }

        this.services = servicesData.filter((s) => s.isActive !== false);

        console.log('✅ Services chargés:', this.services.length);
        return this.services;
      }),
      catchError((error) => {
        console.error('❌ Erreur chargement services:', error);
        this.services = [];
        // Ne pas propager l'erreur, retourner tableau vide
        return of([]);
      })
    );
  }

  /**
   * Charge les types de véhicules du centre
   */
  loadVehicleTypesForCentre(
    centreId: string
  ): Observable<VehicleTypeSettings[]> {
    console.log(
      '📡 Chargement des types de véhicules pour le centre:',
      centreId
    );

    return this.vehiclesSettingsService
      .getActiveVehicleTypesByCentre(centreId)
      .pipe(
        takeUntil(this.destroy$),
        map((response) => {
          let vehicleTypesData: VehicleTypeSettings[] = [];

          // Gérer différents formats de réponse
          if (Array.isArray(response)) {
            vehicleTypesData = response;
          } else if (
            response &&
            response.success &&
            Array.isArray(response.data)
          ) {
            vehicleTypesData = response.data;
          } else if (response && Array.isArray(response.data)) {
            vehicleTypesData = response.data;
          }

          this.vehicleTypes = vehicleTypesData.filter(
            (vt) => vt.isActive !== false
          );

          console.log(
            '✅ Types de véhicules chargés:',
            this.vehicleTypes.length
          );
          return this.vehicleTypes;
        }),
        catchError((error) => {
          console.error('❌ Erreur chargement types de véhicules:', error);
          this.vehicleTypes = [];
          return of([]);
        })
      );
  }

  /**
   * Charge les laveurs du centre
   */
  loadWashersForCentre(centreId: string): Observable<Users[]> {
    console.log('📡 Chargement des laveurs pour le centre:', centreId);

    return this.washsService.getWashersByCentre(centreId).pipe(
      takeUntil(this.destroy$),
      map((response) => {
        let washersData: Users[] = [];

        // Gérer différents formats de réponse
        if (Array.isArray(response)) {
          washersData = response;
        } else if (
          response &&
          response.success &&
          Array.isArray(response.data)
        ) {
          washersData = response.data;
        } else if (response && Array.isArray(response.data)) {
          washersData = response.data;
        }

        this.washers = washersData.filter((w) => w.isEnabled !== false);

        console.log('✅ Laveurs chargés:', this.washers.length);
        return this.washers;
      }),
      catchError((error) => {
        console.error('❌ Erreur chargement laveurs:', error);
        this.washers = [];
        return of([]);
      })
    );
  }
  //#endregion

  //#region Form Methods
  /**
   * Initialise le formulaire avec les données du centre
   */
  initializeForm(): void {
    this.washForm = this.fb.group({
      centreId: ['', Validators.required],

      serviceId: ['', Validators.required],
      vehicleTypeId: ['', Validators.required],
      washerId: ['', Validators.required],
      vehiclePlate: ['', [Validators.required, Validators.minLength(4)]],
      vehicleBrand: [''],
      vehicleColor: [''],
      customerPhone: [
        '',
        [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)],
      ],
      customerName: ['', Validators.required],
      customerEmail: [''],
      transactionId: [''],
      paymentMethod: [PaymentMethod.CASH, Validators.required],
      amountPaid: [0],
      applyLoyaltyDiscount: [false],
      isAdminOverride: [false],
      registration: [''],
      status: [true],
    });

    // Désactiver le champ centreId après création
    this.washForm.get('centreId')?.disable();
  }

  /**
   * Initialise le formulaire avec les données du centre
   */
  initializeFormWithCentreData(): void {
    if (this.managerCentre) {
      this.washForm.patchValue({
        centreId: this.managerCentre.id,
      });
    }
  }

  /**
   * Configure les abonnements aux changements de formulaire
   */
  setupFormSubscriptions(): void {
    // Surveillance du téléphone client
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

    // Surveillance pour recalcul du prix
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

    // Surveillance de la méthode de paiement
    this.washForm
      .get('paymentMethod')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((method: PaymentMethod) => {
        this.selectedPaymentMethod = method;
        this.updateTransactionIdValidation(method);
      });
  }

  /**
   * Met à jour la validation du transactionId selon la méthode de paiement
   */
  updateTransactionIdValidation(method: PaymentMethod): void {
    const transactionControl = this.washForm.get('transactionId');
    if (method !== PaymentMethod.CASH) {
      transactionControl?.setValidators([Validators.required]);
    } else {
      transactionControl?.clearValidators();
      this.washForm.patchValue({ transactionId: '' });
    }
    transactionControl?.updateValueAndValidity();
  }
  //#endregion

  //#region Customer Methods
  /**
   * Recherche un client par numéro de téléphone
   */
  searchCustomerByPhone(phone: string) {
    this.isSearchingCustomer = true;

    return this.washsService.findCustomerByPhone(phone).pipe(
      takeUntil(this.destroy$),
      switchMap((response) => {
        this.isSearchingCustomer = false;

        if (response.success && response.data) {
          this.currentCustomer = response.data;

          // Mettre à jour le nom uniquement s'il est vide
          const currentName = this.washForm.get('customerName')?.value;
          if (!currentName || currentName.trim() === '') {
            this.washForm.patchValue(
              {
                customerName: this.currentCustomer.name,
              },
              { emitEvent: false }
            );
          }

          // Charger l'historique
          this.loadCustomerHistory(phone);

          // Recalculer le prix
          const { serviceId, vehicleTypeId } = this.washForm.value;
          if (serviceId && vehicleTypeId) {
            this.calculatePrice();
          }
        } else {
          this.currentCustomer = null;
          this.customerHistory = [];
        }
        return of(response);
      }),
      catchError((error) => {
        this.isSearchingCustomer = false;
        console.error('Erreur recherche client:', error);
        return of(null);
      })
    );
  }

  /**
   * Charge l'historique du client
   */
  loadCustomerHistory(customerPhone: string): void {
    this.washsService
      .getCustomerWashHistory(customerPhone)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.customerHistory = response.data.slice(0, 5);
          } else {
            this.customerHistory = [];
          }
        },
        error: (error) => {
          console.error('Erreur chargement historique:', error);
          this.customerHistory = [];
        },
      });
  }
  //#endregion

  //#region Price Calculation Methods
  /**
   * Calcule le prix final du lavage
   */
  calculatePrice(): void {
    const { serviceId, vehicleTypeId, customerPhone } = this.washForm.value;

    if (!serviceId || !vehicleTypeId) {
      this.priceCalculation = null;
      return;
    }

    const phoneValid = customerPhone && customerPhone.length >= 10;
    const phoneToUse = phoneValid ? customerPhone : '';

    this.isCalculatingPrice = true;
    this.washsService
      .calculateFinalPrice(serviceId, vehicleTypeId, phoneToUse)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isCalculatingPrice = false;
          if (response.success && response.data) {
            this.priceCalculation = response.data;
            this.applyAutomaticLoyaltyDiscount();

            this.washForm.patchValue(
              {
                amountPaid: this.priceCalculation.finalPrice,
              },
              { emitEvent: false }
            );
          }
        },
        error: (error) => {
          this.isCalculatingPrice = false;
          this.priceCalculation = null;

          // Fallback avec calcul local
          if (error.status === 404 || error.status === 500) {
            this.calculatePriceFallback(serviceId, vehicleTypeId);
          }
        },
      });
  }

  /**
   * Applique automatiquement la remise fidélité
   */
  applyAutomaticLoyaltyDiscount(): void {
    if (!this.priceCalculation || !this.currentCustomer) return;

    const washCount = this.currentCustomer.totalCompletedBookings || 0;

    if (washCount >= 5) {
      const basePrice =
        this.priceCalculation.basePrice *
        this.priceCalculation.vehicleMultiplier;
      const discountAmount = Math.round(basePrice * 0.1);
      const finalPrice = basePrice - discountAmount;

      this.priceCalculation.loyaltyDiscount = discountAmount;
      this.priceCalculation.loyaltyDiscountApplied = true;
      this.priceCalculation.finalPrice = finalPrice;

      this.washForm.patchValue(
        {
          applyLoyaltyDiscount: true,
          amountPaid: finalPrice,
        },
        { emitEvent: false }
      );

      console.log(`✅ Remise fidélité: ${discountAmount} FCFA`);
    }
  }

  /**
   * Calcul de prix de secours
   */
  calculatePriceFallback(
    serviceId: string,
    vehicleTypeId: string
  ): void {
    const service = this.services.find((s) => s.id === serviceId);
    const vehicleType = this.vehicleTypes.find((vt) => vt.id === vehicleTypeId);

    if (service && vehicleType) {
      const basePrice = service.basePrice || 0;
      const vehicleMultiplier = vehicleType.defaultSizeMultiplier || 1;

      this.priceCalculation = new PriceCalculationResult({
        basePrice: basePrice,
        vehicleMultiplier: vehicleMultiplier,
        loyaltyDiscount: 0,
        loyaltyDiscountApplied: false,
        customerWashCount: this.currentCustomer?.totalAmountSpent || 0,
      });

      this.washForm.patchValue({
        amountPaid: this.priceCalculation.finalPrice,
      });
    }
  }
  //#endregion

  //#region Wash Registration Methods
  /**
   * Soumet le formulaire d'enregistrement
   */
  async onSubmit(): Promise<void> {
    if (this.washForm.invalid) {
      this.markFormGroupTouched(this.washForm);
      return;
    }

    this.isSubmitting = true;
    this.errorMessages = [];
    this.successMessage = '';

    try {
      // Générer le numéro d'enregistrement
      if (!this.washForm.value.registration) {
        const autoRegistration = this.generateRegistrationNumber();
        this.washForm.patchValue({ registration: autoRegistration });
      }

      // Créer ou obtenir le client
      const customer = await this.getOrCreateCustomer();

      // Préparer l'enregistrement
      const registration = this.prepareWashRegistration(customer);

      // Enregistrer le lavage
      const washSession = await this.registerWash(registration);

      // Enregistrer le paiement si nécessaire
      if (
        this.selectedPaymentMethod !== PaymentMethod.CASH ||
        this.washForm.value.transactionId
      ) {
        await this.registerPayment(washSession.id ? washSession.id : '');
      }

      this.successMessage = 'Lavage enregistré avec succès!';
      this.resetForm();
    } catch (error) {
      this.handleError("Erreur lors de l'enregistrement", error);
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Crée ou récupère un client
   */
  async getOrCreateCustomer(): Promise<Customer> {
    const { customerPhone, customerName, customerEmail, vehicleBrand } =
      this.washForm.value;

    if (!customerName || customerName.trim() === '') {
      throw new Error('Le nom du client est obligatoire');
    }

    const selectedVehicleType = this.vehicleTypes.find(
      (vt) => vt.id === this.washForm.value.vehicleTypeId
    );
    const vehicleTypeLabel = selectedVehicleType?.label || 'Non spécifié';

    const customerRequest: CreateOrUpdateCustomerRequest = {
      phone: customerPhone,
      name: customerName.trim(),
      ...(customerEmail &&
        customerEmail.trim() !== '' && { email: customerEmail.trim() }),
      vehicleType: vehicleTypeLabel,
      vehicleBrand: vehicleBrand || 'Non spécifié',
    };

    return new Promise((resolve, reject) => {
      this.washsService
        .registerCustomer(customerRequest)
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

  /**
   * Prépare l'objet d'enregistrement
   */
  prepareWashRegistration(customer?: Customer): WashRegistration {
    const formValue = this.washForm.value;

    if (!formValue.customerName || formValue.customerName.trim() === '') {
      throw new Error('Le nom du client est obligatoire');
    }

    const selectedVehicleType = this.vehicleTypes.find(
      (vt) => vt.id === formValue.vehicleTypeId
    );
    const vehicleTypeLabel = selectedVehicleType?.label || 'Non spécifié';

    const customerRequest: CreateOrUpdateCustomerRequest = {
      phone: formValue.customerPhone,
      name: formValue.customerName.trim(),
      ...(formValue.customerEmail &&
        formValue.customerEmail.trim() !== '' && {
          email: formValue.customerEmail.trim(),
        }),
      vehicleType: vehicleTypeLabel,
      vehicleBrand: formValue.vehicleBrand || 'Non spécifié',
    };

    return {
      centreId: this.managerCentre?.id ?? '',
      serviceId: formValue.serviceId,
      vehicleTypeId: formValue.vehicleTypeId,
      WasherId: formValue.washerId || '',
      vehiclePlate: formValue.vehiclePlate.toUpperCase(),
      vehicleBrand: formValue.vehicleBrand || 'Non spécifié',
      vehicleColor: formValue.vehicleColor || 'Non spécifié',
      customer: customerRequest,
      amountPaid: this.priceCalculation?.finalPrice || 0,
      paymentMethod: Number(formValue.paymentMethod),
      transactionId: formValue.transactionId || '',
      applyLoyaltyDiscount: formValue.applyLoyaltyDiscount,
      isAdminOverride: formValue.isAdminOverride,
      performedByUserId: this.currentUser?.id || '',
      registration: formValue.registration || this.generateRegistrationNumber(),
      status: true,
    };
  }

  /**
   * Enregistre le lavage via l'API
   */
  async registerWash(
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
              reject(new Error("Échec de l'enregistrement"));
            }
          },
          error: reject,
        });
    });
  }

  /**
   * Enregistre le paiement
   */
  async registerPayment(washSessionId: string): Promise<void> {
    const { transactionId, applyLoyaltyDiscount } = this.washForm.value;

    const transactionRef =
      transactionId || (await this.generateTransactionReference());

    const paymentInfo = new PaymentInfo({
      method: this.selectedPaymentMethod,
      amount: this.priceCalculation?.finalPrice || 0,
      transactionId: transactionRef,
      applyLoyaltyDiscount: applyLoyaltyDiscount || false,
      receivedBy: this.currentUser?.id || '',
      discountCode: '',
    });

    return new Promise((resolve, reject) => {
      this.washsService
        .registerPayment(washSessionId, paymentInfo)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              resolve();
            } else {
              reject(new Error('Échec du paiement'));
            }
          },
          error: reject,
        });
    });
  }
  //#endregion

  //#region Utility Methods
  /**
   * Génère un numéro d'enregistrement unique
   */
  generateRegistrationNumber(): string {
    const timestamp = new Date().getTime().toString().slice(-6);
    this.registrationCounter = (this.registrationCounter + 1) % 1000;
    const counter = this.registrationCounter.toString().padStart(3, '0');
    return `REG-${timestamp}-${counter}`;
  }

  /**
   * Génère une référence de transaction
   */
  async generateTransactionReference(): Promise<string> {
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

  /**
   * Réinitialise le formulaire
   */
  resetForm(): void {
    this.washForm.reset({
      centreId: this.managerCentre?.id,
      serviceId: '',
      vehicleTypeId: '',
      washerId: '',
      vehiclePlate: '',
      vehicleBrand: '',
      vehicleColor: '',
      customerPhone: '',
      customerName: '',
      customerEmail: '',
      transactionId: '',
      paymentMethod: PaymentMethod.CASH,
      amountPaid: 0,
      applyLoyaltyDiscount: false,
      isAdminOverride: false,
      registration: '',
      status: true,
    });

    this.currentCustomer = null;
    this.customerHistory = [];
    this.priceCalculation = null;
    this.selectedPaymentMethod = PaymentMethod.CASH;
    this.errorMessages = [];
    this.successMessage = '';
  }

  /**
   * Marque tous les contrôles comme touchés
   */
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((field) => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  /**
   * Gère les erreurs
   */
  handleError(message: string, error: any): void {
    this.errorMessages = [message];
    if (error?.error?.message) {
      this.errorMessages.push(error.error.message);
    }
  }
  //#endregion

  //#region User Management Methods
  /**
   * Charge la photo de l'utilisateur courant
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
          console.error('Erreur chargement photo:', error);
          this.setDefaultUserPhoto();
        },
      });
    } else {
      this.setDefaultUserPhoto();
    }
  }

  /**
   * Définit une photo par défaut
   */
  setDefaultUserPhoto(): void {
    if (this.currentUser) {
      this.currentUser.photoSafeUrl = this.sanitizer.bypassSecurityTrustUrl(
        'assets/images/default-avatar.png'
      );
    }
  }

  /**
   * Retourne le nom complet
   */
  getFullName(): string {
    if (this.currentUser) {
      const firstName = this.currentUser.firstName || '';
      const lastName = this.currentUser.lastName || '';
      return `${firstName} ${lastName}`.trim() || 'Manager';
    }
    return 'Manager';
  }

  /**
   * Retourne le rôle
   */
  getUserRole(): string {
    if (!this.currentUser) return 'Manager';

    if (this.currentUser.roles && this.currentUser.roles.length > 0) {
      return this.mapRoleIdToName(this.currentUser.roles[0]);
    }

    return 'Manager';
  }

  mapRoleIdToName(roleId: string): string {
    const roleMapping: { [key: string]: string } = {
      '1': 'Administrateur',
      '2': 'Manager',
      '3': 'Éditeur',
      '4': 'Washer',
    };
    return roleMapping[roleId] || 'Manager';
  }
  //#endregion

  //#region UI Methods
  /**
   * Change la méthode de paiement
   */
  onPaymentMethodChange(method: PaymentMethod): void {
    this.selectedPaymentMethod = method;
    this.washForm.patchValue({ paymentMethod: method });
    this.updateTransactionIdValidation(method);
  }

  /**
   * Bascule la sidebar
   */
  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    if (sidebar && mainContent) {
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('collapsed');
    }
  }

  /**
   * Déconnecte l'utilisateur
   */
  logout(): void {
    if (this.authService.isAuthenticated()) {
      try {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
      } catch (error) {
        console.error('Erreur déconnexion:', error);
        this.router.navigate(['/auth/login']);
      }
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Retourne le libellé de la méthode de paiement
   */
  getPaymentMethodString(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.CASH:
        return 'Espèces';
      case PaymentMethod.CREDIT_CARD:
        return 'Carte';
      case PaymentMethod.MOBILE_MONEY:
        return 'Mobile Money';
      case PaymentMethod.BANK_TRANSFER:
        return 'Virement';
      default:
        return 'Espèces';
    }
  }
  //#endregion

  //#region Getters
  get isFormValid(): boolean {
    return this.washForm.valid && !this.isSubmitting;
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

  get centreName(): string {
    return this.managerCentre?.name || 'Centre non défini';
  }
  //#endregion
}

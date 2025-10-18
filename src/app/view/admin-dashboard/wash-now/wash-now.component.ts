import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
  catchError,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  finalize,
  lastValueFrom,
  of,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { Centres } from '../../../core/models/Centres/Centres';
import { Customer } from '../../../core/models/Customer/Customer';
import { PriceCalculationResult } from '../../../core/models/Wash/PriceCalculationResult';
import { WashSession } from '../../../core/models/Wash/WashSession';
import { WashsService } from '../../../core/services/Washs/washs.service';
import { CreateOrUpdateCustomerRequest } from '../../../core/models/Wash/CreateOrUpdateCustomerRequest';
import { WashRegistration } from '../../../core/models/Wash/WashRegistration';
import { PaymentInfo } from '../../../core/models/Payments/PaymentInfo';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { CentresService } from '../../../core/services/Centres/centres.service';
import { ServiceSettingsService } from '../../../core/services/ServiceSettings/service-settings.service';
import { VehiclesSettingsService } from '../../../core/services/VehiclesSettings/vehicles-settings.service';
import { ServiceSettings } from '../../../core/models/Settings/Services/ServiceSettings';
import { VehicleTypeSettings } from '../../../core/models/Settings/Vehicles/VehicleTypeSettings';

@Component({
  selector: 'app-wash-now',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    CommonModule,
    DatePipe,
  ],
  templateUrl: './wash-now.component.html',
  styleUrl: './wash-now.component.scss',
})
export class WashNowComponent implements OnInit {
  //#region Properties
  // Utilisateurs
  users: Users[] = [];
  displayedUsers: Users[] = [];
  currentUser: Users | null = null;
  user: Users | null = null;
  isSidebarCollapsed = false;
  washForm!: FormGroup;

  loyaltyDiscountApplied = false;
  loyaltyDiscountMessage = '';

  // Laveurs
  washers: Users[] = []; // Liste complète des laveurs
  filteredWashers: Users[] = []; // Laveurs filtrés (par centre)
  isLoadingWashers = false; // État de chargement

  // Centres, services et types de véhicules
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

  // Messages
  errorMessages: string[] = [];
  successMessage = '';

  // Compteur pour génération de numéros d'enregistrement
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
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
    this.setupFormSubscriptions();
  }
  //#endregion

  //#region Lifecycle Hooks
  ngOnInit(): void {
    this.initializeForm();
    this.setupFormSubscriptions();

    this.getUsers();
    this.loadCurrentUser();

    this.authService.currentUser$.subscribe((user) => {
      if (user && user !== this.currentUser) {
        this.currentUser = user;
        this.loadCurrentUserPhoto();
      }
    });
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  //#endregion

  //#region Form Methods
  /**
   * Initialise le formulaire avec les contrôles et validateurs
   */
  private initializeForm(): void {
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
      status: true,
    });

    // Désactiver les champs après création du formulaire
    this.washForm.get('serviceId')?.disable();
    this.washForm.get('vehicleTypeId')?.disable();
    this.washForm.get('washerId')?.disable();
  }

  /**
   * Configure les abonnements aux changements de valeur du formulaire
   */
  private setupFormSubscriptions(): void {
    // Surveillance des changements du centre
    this.washForm
      .get('centreId')
      ?.valueChanges.pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe(async (centreId) => {
        console.log('Centre changed to:', centreId);

        if (centreId) {
          // Réinitialiser les valeurs AVANT de désactiver
          this.washForm.patchValue({
            serviceId: '',
            vehicleTypeId: '',
            washerId: '',
          });

          // Réinitialiser immédiatement les listes
          this.services = [];
          this.vehicleTypes = [];
          this.filteredWashers = [];

          try {
            // Charger les données en parallèle
            await Promise.all([
              this.loadServicesByCentre(centreId),
              this.loadVehicleTypesByCentre(centreId),
              this.loadWashersByCentre(centreId),
            ]);

            // Activer les champs APRÈS avoir chargé les données
            this.washForm.get('serviceId')?.enable();
            this.washForm.get('vehicleTypeId')?.enable();
            this.washForm.get('washerId')?.enable();
          } catch (error) {
            console.error('Error loading centre data:', error);
            this.handleError(
              'Erreur lors du chargement des données du centre',
              error
            );
          }
        }
      });

    // Surveillance de la méthode de paiement
    this.washForm
      .get('paymentMethod')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((method: PaymentMethod) => {
        this.selectedPaymentMethod = method;
        const transactionControl = this.washForm.get('transactionId');
        if (method !== PaymentMethod.CASH) {
          transactionControl?.setValidators([Validators.required]);
        } else {
          transactionControl?.clearValidators();
        }
        transactionControl?.updateValueAndValidity();
      });

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
  }

  /**
   * Débogue la validation du formulaire
   */
  debugFormValidation(): void {
    console.log('Form valid:', this.washForm.valid);
    console.log('Form status:', this.washForm.status);
    console.log('Form errors:', this.washForm.errors);

    // Vérification spéciale pour le nom du client
    const customerName = this.washForm.get('customerName');
    if (customerName?.invalid) {
      console.log('Customer name errors:', customerName.errors);
      if (customerName.errors?.['required']) {
        console.log('Le nom du client est obligatoire');
      }
    }

    Object.keys(this.washForm.controls).forEach((key) => {
      const control = this.washForm.get(key);
      if (control?.invalid) {
        console.log(`${key} errors:`, control.errors);
      }
    });
  }

  /**
   * Marque tous les contrôles du formulaire comme touchés
   */
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((field) => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  /**
   * Réinitialise le formulaire aux valeurs par défaut
   */
  resetForm(): void {
    // Activer temporairement tous les champs avant le reset
    this.washForm.get('serviceId')?.enable();
    this.washForm.get('vehicleTypeId')?.enable();
    this.washForm.get('washerId')?.enable();

    // Réinitialiser le formulaire
    this.washForm.reset({
      centreId: '',
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

    // Réinitialiser les états de remise fidélité
    this.loyaltyDiscountApplied = false;
    this.loyaltyDiscountMessage = '';

    // Réinitialiser les données du composant
    this.currentCustomer = null;
    this.customerHistory = [];
    this.priceCalculation = null;
    this.selectedPaymentMethod = PaymentMethod.CASH;
    this.services = [];
    this.vehicleTypes = [];
    this.filteredWashers = [];

    // Réinitialiser les messages
    this.errorMessages = [];
    this.successMessage = '';

    // Désactiver à nouveau les champs dépendants
    this.washForm.get('serviceId')?.disable();
    this.washForm.get('vehicleTypeId')?.disable();
    this.washForm.get('washerId')?.disable();

    // Marquer tous les champs comme non touchés
    Object.keys(this.washForm.controls).forEach((key) => {
      this.washForm.get(key)?.markAsUntouched();
      this.washForm.get(key)?.markAsPristine();
    });

    // Forcer la détection des changements
    this.cdr.detectChanges();
  }
  //#endregion

  //#region Data Loading Methods
  /**
   * Charge les données initiales du composant
   */
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

  /**
   * Charge les centres actifs
   */
  private async loadActiveCentres(): Promise<void> {
    this.centresService
      .getAllCentres()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (centres) => {
          this.centres = centres;
        },
        error: (error) =>
          this.handleError('Erreur lors du chargement des centres', error),
      });
  }

  /**
   * Charge les laveurs par centre
   */
  async loadWashersByCentre(centreId: string): Promise<void> {
    try {
      this.isLoadingWashers = true;
      this.washers = [];
      this.filteredWashers = [];
      this.cdr.detectChanges();

      const response = await lastValueFrom(
        this.washsService.getWashersByCentre(centreId).pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            console.error('Error loading washers:', error);
            this.handleError('Erreur lors du chargement des laveurs', error);
            return of({ success: false, data: [] });
          })
        )
      );

      // Gérer la réponse
      if (Array.isArray(response)) {
        this.washers = response;
        this.filteredWashers = [...response];
      } else if (response?.data && Array.isArray(response.data)) {
        this.washers = response.data;
        this.filteredWashers = [...response.data];
      } else {
        this.washers = [];
        this.filteredWashers = [];
      }
    } catch (error) {
      console.error('Unexpected error loading washers:', error);
      this.washers = [];
      this.filteredWashers = [];
    } finally {
      this.isLoadingWashers = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Charge les services par centre
   */
  private async loadServicesByCentre(centreId: string): Promise<void> {
    this.serviceSettingsService
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

  /**
   * Charge les types de véhicules par centre
   */
  private async loadVehicleTypesByCentre(centreId: string): Promise<void> {
    this.vehiclesSettingsService
      .getActiveVehicleTypesByCentre(centreId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          let vehicleTypesData: VehicleTypeSettings[] = [];

          if (Array.isArray(response)) {
            vehicleTypesData = response;
          } else if (response && response.success && response.data) {
            vehicleTypesData = response.data;
          } else if (response && response.data) {
            vehicleTypesData = response.data;
          }

          this.vehicleTypes = vehicleTypesData;
        },
        error: (error) => {
          console.error(
            'Erreur lors du chargement des types de véhicules:',
            error
          );
          this.handleError(
            'Erreur lors du chargement des types de véhicules',
            error
          );
          this.vehicleTypes = [];
        },
      });
  }
  //#endregion

  //#region Customer Methods
  /**
   * Recherche un client par numéro de téléphone
   */
  private searchCustomerByPhone(phone: string) {
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

          // Recalculer le prix pour appliquer automatiquement la remise
          const { serviceId, vehicleTypeId } = this.washForm.value;
          if (serviceId && vehicleTypeId) {
            this.calculatePrice();
          }
        } else {
          this.currentCustomer = null;
          this.customerHistory = [];
          this.loyaltyDiscountApplied = false;
          this.loyaltyDiscountMessage = '';
        }
        return of(response);
      }),
      catchError((error) => {
        this.isSearchingCustomer = false;
        console.error('Erreur lors de la recherche du client:', error);
        return of(null);
      })
    );
  }

  /**
   * Charge l'historique des lavages d'un client
   */
  private loadCustomerHistory(customerPhone: string): void {
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
          console.error("Erreur lors du chargement de l'historique:", error);
          this.customerHistory = [];
        },
      });
  }

  /**
   * Crée ou récupère un client
   */
  private async getOrCreateCustomer(): Promise<Customer> {
    const { customerPhone, customerName, customerEmail, vehicleBrand } =
      this.washForm.value;

    // Validation du nom
    if (!customerName || customerName.trim() === '') {
      throw new Error('Le nom du client est obligatoire');
    }

    // Récupérer le type de véhicule sélectionné
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
  //#endregion

  //#region Price Calculation Methods
  /**
   * Calcule le prix final du lavage
   */
  calculatePrice(): void {
    const { serviceId, vehicleTypeId, customerPhone } = this.washForm.value;

    // Réinitialiser si les données essentielles manquent
    if (!serviceId || !vehicleTypeId) {
      this.priceCalculation = null;
      this.loyaltyDiscountApplied = false;
      this.loyaltyDiscountMessage = '';
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

            // Vérifier l'éligibilité et appliquer automatiquement la remise
            this.applyAutomaticLoyaltyDiscount();

            // Mettre à jour le montant à payer
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
          this.loyaltyDiscountApplied = false;
          this.loyaltyDiscountMessage = '';

          // Fallback avec calcul local
          if (error.status === 404 || error.status === 500) {
            this.calculatePriceFallback(serviceId, vehicleTypeId);
          }
        },
      });
  }

  /**
   * Applique automatiquement la remise fidélité si le client est éligible
   */
  private applyAutomaticLoyaltyDiscount(): void {
    if (!this.priceCalculation || !this.currentCustomer) {
      this.loyaltyDiscountApplied = false;
      this.loyaltyDiscountMessage = '';
      return;
    }

    const washCount = this.currentCustomer.totalCompletedBookings || 0;

    // Client éligible : au moins 5 lavages
    if (washCount >= 5) {
      // Calculer le prix de base total
      const basePrice =
        this.priceCalculation.basePrice *
        this.priceCalculation.vehicleMultiplier;

      // Appliquer la remise de 10%
      const discountAmount = Math.round(basePrice * 0.1);
      const finalPrice = basePrice - discountAmount;

      // Mettre à jour l'objet priceCalculation
      this.priceCalculation.loyaltyDiscount = discountAmount;
      this.priceCalculation.loyaltyDiscountApplied = true;
      this.priceCalculation.finalPrice = finalPrice;

      // Mettre à jour le formulaire
      this.washForm.patchValue(
        {
          applyLoyaltyDiscount: true,
          amountPaid: finalPrice,
        },
        { emitEvent: false }
      );

      // Définir les messages d'état
      this.loyaltyDiscountApplied = true;
      this.loyaltyDiscountMessage = 'Remise fidélité appliquée';

      console.log(
        `✅ Remise fidélité automatique: ${discountAmount} FCFA (Prix final: ${finalPrice} FCFA)`
      );
    } else {
      // Client non éligible
      this.priceCalculation.loyaltyDiscount = 0;
      this.priceCalculation.loyaltyDiscountApplied = false;

      this.washForm.patchValue(
        {
          applyLoyaltyDiscount: false,
        },
        { emitEvent: false }
      );

      this.loyaltyDiscountApplied = false;
      this.loyaltyDiscountMessage = '';

      console.log(`ℹ️ Client non éligible: ${washCount}/5 lavages`);
    }

    // Forcer la détection des changements
    this.cdr.detectChanges();
  }

  /**
   * Calcul de prix de secours en cas d'échec de l'API
   */
  private calculatePriceFallback(
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

  /**
   * Réinitialise le calcul du prix
   */
  resetPriceCalculation(): void {
    this.priceCalculation = null;
    this.washForm.patchValue({
      serviceId: '',
      vehicleTypeId: '',
    });
  }
  //#endregion

  //#region Wash Registration Methods
  /**
   * Soumet le formulaire d'enregistrement de lavage
   */
  async onSubmit(): Promise<void> {
    this.debugFormValidation();
    if (this.washForm.invalid) {
      this.markFormGroupTouched(this.washForm);
      return;
    }

    this.isSubmitting = true;
    this.errorMessages = [];
    this.successMessage = '';

    try {
      // Générer le numéro d'enregistrement si non fourni
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

      // Réinitialisation complète du formulaire
      this.washForm.reset();

      // Réappliquer les valeurs par défaut
      this.washForm.patchValue({
        paymentMethod: PaymentMethod.CASH,
        amountPaid: 0,
        applyLoyaltyDiscount: false,
        isAdminOverride: false,
        status: true,
      });

      // Réinitialiser les états
      this.currentCustomer = null;
      this.customerHistory = [];
      this.priceCalculation = null;
      this.selectedPaymentMethod = PaymentMethod.CASH;

      // Désactiver les champs dépendants
      this.washForm.get('serviceId')?.disable();
      this.washForm.get('vehicleTypeId')?.disable();
      this.washForm.get('washerId')?.disable();

      // Forcer la détection des changements
      this.cdr.detectChanges();
    } catch (error) {
      this.handleError("Erreur lors de l'enregistrement du lavage", error);
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Prépare l'objet d'enregistrement de lavage
   */
  private prepareWashRegistration(customer?: Customer): WashRegistration {
    const formValue = this.washForm.value;

    // Validation du nom
    if (!formValue.customerName || formValue.customerName.trim() === '') {
      throw new Error('Le nom du client est obligatoire');
    }

    // Récupérer le type de véhicule
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
      centreId: formValue.centreId,
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
  //#endregion

  //#region Payment Methods
  /**
   * Change la méthode de paiement sélectionnée
   */
  onPaymentMethodChange(method: PaymentMethod): void {
    this.selectedPaymentMethod = method;

    this.washForm.patchValue({
      paymentMethod: method,
    });

    // Gérer la validation du transactionId
    const transactionControl = this.washForm.get('transactionId');
    if (method !== PaymentMethod.CASH) {
      transactionControl?.setValidators([Validators.required]);
    } else {
      transactionControl?.clearValidators();
      this.washForm.patchValue({ transactionId: '' });
    }
    transactionControl?.updateValueAndValidity();
  }

  /**
   * Enregistre le paiement via l'API
   */
  private async registerPayment(washSessionId: string): Promise<void> {
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

    // Valider le paiement avant envoi
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

  /**
   * Génère une référence de transaction
   */
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

  //#region Utility Methods
  /**
   * Génère un numéro d'enregistrement unique
   */
  private generateRegistrationNumber(): string {
    const timestamp = new Date().getTime().toString().slice(-6);
    this.registrationCounter = (this.registrationCounter + 1) % 1000;
    const counter = this.registrationCounter.toString().padStart(3, '0');
    return `REG-${timestamp}-${counter}`;
  }

  /**
   * Gère les erreurs de l'application
   */
  private handleError(message: string, error: any): void {
    this.errorMessages = [message];
    if (error?.error?.message) {
      this.errorMessages.push(error.error.message);
    }
  }

  /**
   * Récupère les contrôles invalides du formulaire
   */
  getInvalidControls(): Array<{ name: string; errors: any }> {
    const invalid = [];
    const controls = this.washForm.controls;
    for (const name in controls) {
      if (controls[name].invalid) {
        invalid.push({
          name: name,
          errors: controls[name].errors,
        });
      }
    }
    return invalid;
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

  get customerTotalSpent(): number {
    return this.currentCustomer?.totalAmountSpent || 0;
  }
  //#endregion

  //#region User Management Methods
  /**
   * Récupère tous les utilisateurs et charge leurs photos.
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
   * Charge l'utilisateur actuellement connecté.
   */
  loadCurrentUser(): void {
    this.authService.loadCurrentUserProfile().subscribe({
      next: (user) => {
        if (user) {
          this.currentUser = user;
          this.loadCurrentUserPhoto();
        } else {
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
   * Charge les photos des utilisateurs et les sécurise pour l'affichage.
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
   * Charge la photo de l'utilisateur actuellement connecté.
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
          this.currentUser!.photoSafeUrl =
            this.sanitizer.bypassSecurityTrustUrl(
              'assets/images/default-avatar.png'
            );
        },
      });
    } else {
      this.currentUser.photoSafeUrl = this.sanitizer.bypassSecurityTrustUrl(
        'assets/images/default-avatar.png'
      );
    }
  }

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

  //#region UI Interaction Methods
  /**
   * Bascule l'état de la barre latérale
   */
  toggleSidebar() {
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
        console.error('Erreur lors de la déconnexion:', error);
        this.router.navigate(['/auth/login']);
      }
    } else {
      this.router.navigate(['/auth/login']);
    }
  }
  //#endregion
}

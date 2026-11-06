import {
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OnboardingAnalytics } from '../../core/analytics/onboarding-analytics';
import {
  DOCUMENT_MAX_LENGTH,
  KYC_REQUEST_SCENARIOS,
  Kyc,
  KycRequestScenario,
  TEST_DOCUMENT_TYPE,
} from '../../core/api/kyc.models';
import { MESSAGES, errorMessage, isDataError, isRetryable } from '../../core/i18n/messages.es-pe';
import { FieldError } from '../../shared/forms/field-error';
import { focusFirstInvalid } from '../../shared/forms/focus-first-invalid';
import { Icon } from '../../shared/ui/icon';
import { OnboardingStore } from './onboarding.store';
import { RegistrationResult } from './registration-result';
import { StepProgress } from './step-progress';

/**
 * Registro W1 en tres pasos: 1) Tus datos, 2) Verificación (KYC simulado), 3) Tu wallet.
 * Los pasos son del cliente: el contrato no entrega una definición de pasos.
 */
@Component({
  selector: 'app-registration-page',
  imports: [ReactiveFormsModule, RouterLink, FieldError, Icon, RegistrationResult, StepProgress],
  templateUrl: './registration.page.html',
  styleUrl: './registration.page.css',
})
export class RegistrationPage {
  protected readonly store = inject(OnboardingStore);
  private readonly analytics = inject(OnboardingAnalytics);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly t = MESSAGES.registration;
  protected readonly scenarioLabels = MESSAGES.scenarios;
  protected readonly scenarios = KYC_REQUEST_SCENARIOS;
  protected readonly documentType = TEST_DOCUMENT_TYPE;

  protected readonly form = inject(NonNullableFormBuilder).group({
    document: ['', [Validators.required, Validators.pattern(/^TEST-.*$/), Validators.maxLength(DOCUMENT_MAX_LENGTH)]],
    scenario: ['APPROVED' as KycRequestScenario, Validators.required],
  });

  /** Paso del formulario (1 o 2); con una verificación creada el paso es 3. */
  private readonly formStep = signal<1 | 2>(1);
  protected readonly step = computed(() => (this.store.kyc() ? 3 : this.formStep()));

  /** Se muestra el estado de error de los campos tras intentar avanzar o al salir del campo. */
  protected readonly submitted = signal(false);

  protected readonly serverError = computed(() => {
    const error = this.store.error();
    if (!error) return null;
    return {
      message: errorMessage(error.code),
      retryable: isRetryable(error.code),
      fixData: isDataError(error.code),
    };
  });

  private readonly errorAlert = viewChild<ElementRef<HTMLElement>>('errorAlert');
  private readonly stepHeading = viewChild<ElementRef<HTMLElement>>('stepHeading');

  /** Última verificación y estado ya registrados en analítica. */
  private seenKycId: string | null;
  private seenStatus: Kyc['status'] | null;

  constructor() {
    const existing = this.store.kyc();
    this.seenKycId = existing?.id ?? null;
    this.seenStatus = existing?.status ?? null;
    if (!existing) this.analytics.start();

    // Analítica: fin del paso de verificación y cierre del flujo según el estado.
    effect(() => {
      const kyc = this.store.kyc();
      untracked(() => this.trackKyc(kyc));
    });

    // El abandono también se registra para medir dónde se pierde el flujo.
    inject(DestroyRef).onDestroy(() => {
      if (this.analytics.active) {
        this.analytics.close(this.store.kyc()?.status === 'PENDING' ? 'pending_review' : 'abandoned');
      }
    });

    // Al cambiar de paso, el foco va al encabezado del paso (el resultado enfoca el suyo).
    let previousStep = this.step();
    afterRenderEffect(() => {
      const step = this.step();
      if (step !== previousStep && step < 3) this.stepHeading()?.nativeElement.focus();
      previousStep = step;
    });

    // Un error del servidor recibe el foco para que se anuncie y se pueda actuar sobre él.
    afterRenderEffect(() => {
      if (this.store.error()) this.errorAlert()?.nativeElement.focus();
    });
  }

  protected documentError(): string | null {
    const control = this.form.controls.document;
    if (!control.invalid || !(control.touched || this.submitted())) return null;
    if (control.hasError('required')) return MESSAGES.validation.documentRequired;
    if (control.hasError('maxlength')) return MESSAGES.validation.documentMaxLength(DOCUMENT_MAX_LENGTH);
    return MESSAGES.validation.documentPrefix;
  }

  protected describedBy(hintId: string, error: string | null, errorId: string): string {
    return error ? `${hintId} ${errorId}` : hintId;
  }

  /** Paso 1 → 2: bloquea el avance si el documento falta o es inválido. */
  protected continue(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      focusFirstInvalid(this.form, this.host.nativeElement);
      return;
    }
    this.store.error.set(null);
    this.analytics.completeStep('datos');
    this.formStep.set(2);
  }

  /** Paso 2: crea la verificación KYC. */
  protected verify(): void {
    if (this.form.invalid) {
      this.editData();
      return;
    }
    const { document, scenario } = this.form.getRawValue();
    this.store.register({ documentType: TEST_DOCUMENT_TYPE, document: document.trim(), scenario });
  }

  /** Vuelve al paso 1 conservando lo ingresado. */
  protected editData(): void {
    this.store.error.set(null);
    this.formStep.set(1);
  }

  /** Inicia un nuevo registro (nuevo flujo de analítica). */
  protected restart(): void {
    if (this.analytics.active) this.analytics.close('abandoned');
    this.store.reset();
    this.form.reset();
    this.submitted.set(false);
    this.formStep.set(1);
    this.seenKycId = null;
    this.seenStatus = null;
    this.analytics.start();
  }

  private trackKyc(kyc: Kyc | null): void {
    if (!kyc) return;
    if (kyc.id !== this.seenKycId) {
      this.seenKycId = kyc.id;
      this.seenStatus = null;
      this.analytics.completeStep('verificacion');
    }
    if (kyc.status === this.seenStatus) return;
    this.seenStatus = kyc.status;
    if (kyc.status === 'ACTIVE') {
      this.analytics.completeStep('wallet');
      this.analytics.close('activated');
    } else if (kyc.status === 'REJECTED') {
      this.analytics.close('rejected');
    }
  }
}

import { Component, ElementRef, Injector, afterNextRender, afterRenderEffect, computed, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  DOCUMENT_MAX_LENGTH,
  KYC_REQUEST_SCENARIOS,
  KycRequestScenario,
  TEST_DOCUMENT_PREFIX,
  TEST_DOCUMENT_TYPE,
} from '../../core/api/kyc.models';
import { MESSAGES, errorMessage, isRetryable } from '../../core/i18n/messages.es-pe';
import { FieldError } from '../../shared/forms/field-error';
import { focusFirstInvalid } from '../../shared/forms/focus-first-invalid';
import { OnboardingStore } from './onboarding.store';
import { RegistrationResult } from './registration-result';

/** Registro W1: verificación KYC simulada y creación de la wallet. */
@Component({
  selector: 'app-registration-page',
  imports: [ReactiveFormsModule, FieldError, RegistrationResult],
  templateUrl: './registration.page.html',
  styleUrl: './registration.page.css',
})
export class RegistrationPage {
  protected readonly store = inject(OnboardingStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly t = MESSAGES.registration;
  protected readonly scenarioLabels = MESSAGES.scenarios;
  protected readonly scenarios = KYC_REQUEST_SCENARIOS;
  protected readonly documentType = TEST_DOCUMENT_TYPE;

  protected readonly form = inject(NonNullableFormBuilder).group({
    document: [
      TEST_DOCUMENT_PREFIX,
      [Validators.required, Validators.pattern(/^TEST-.*$/), Validators.maxLength(DOCUMENT_MAX_LENGTH)],
    ],
    scenario: ['APPROVED' as KycRequestScenario, Validators.required],
  });

  /** Se muestra el estado de error de los campos tras el primer intento de envío o al salir del campo. */
  protected readonly submitted = signal(false);

  protected readonly serverError = computed(() => {
    const error = this.store.error();
    return error ? { message: errorMessage(error.code), retryable: isRetryable(error.code) } : null;
  });

  private readonly errorAlert = viewChild<ElementRef<HTMLElement>>('errorAlert');
  private readonly title = viewChild<ElementRef<HTMLElement>>('title');

  constructor() {
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

  protected submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      focusFirstInvalid(this.form, this.host.nativeElement);
      return;
    }
    const { document, scenario } = this.form.getRawValue();
    this.store.register({ documentType: TEST_DOCUMENT_TYPE, document: document.trim(), scenario });
  }

  protected restart(): void {
    this.store.reset();
    this.submitted.set(false);
    afterNextRender(() => this.title()?.nativeElement.focus(), { injector: this.injector });
  }
}

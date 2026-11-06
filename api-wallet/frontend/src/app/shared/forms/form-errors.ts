import { AbstractControl, FormGroup } from '@angular/forms';
import { FieldError } from '../../core/api/api.models';
import { MESSAGES } from '../i18n/messages.es-pe';

const SERVER_ERROR = 'server';

export function applyServerErrors(form: FormGroup, errors: FieldError[]): void {
  for (const { field, message } of errors) {
    const control = form.get(field);
    control?.setErrors({ [SERVER_ERROR]: message });
    control?.markAsTouched();
  }
}

export function fieldErrorMessage(control: AbstractControl | null): string | null {
  if (!control?.errors || !control.touched) {
    return null;
  }
  const serverMessage = control.errors[SERVER_ERROR];
  if (typeof serverMessage === 'string') {
    return serverMessage;
  }
  const key = Object.keys(control.errors).find((errorKey) => errorKey in MESSAGES.validation);
  return key ? MESSAGES.validation[key as keyof typeof MESSAGES.validation] : null;
}

export function focusFirstError(host: HTMLElement): void {
  host.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}

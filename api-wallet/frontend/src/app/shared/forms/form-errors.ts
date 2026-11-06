import { AbstractControl } from '@angular/forms';
import { MESSAGES } from '../i18n/messages.es-pe';

export function fieldErrorMessage(control: AbstractControl | null): string | null {
  if (!control?.errors || !control.touched) {
    return null;
  }
  const key = Object.keys(control.errors).find((errorKey) => errorKey in MESSAGES.validation);
  return key ? MESSAGES.validation[key as keyof typeof MESSAGES.validation] : null;
}

export function focusFirstError(host: HTMLElement): void {
  host.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}

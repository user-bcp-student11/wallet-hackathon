import { ValidatorFn } from '@angular/forms';

const DOCUMENT_PREFIX = 'TEST-';
const DOCUMENT_MAX_LENGTH = 200;

export const requiredChoice =
  (errorKey: string): ValidatorFn =>
  (control) =>
    String(control.value ?? '').trim() ? null : { [errorKey]: true };

export const testDocumentValidator: ValidatorFn = (control) => {
  const document = String(control.value ?? '').trim();
  if (!document) {
    return { documentRequired: true };
  }
  if (!document.startsWith(DOCUMENT_PREFIX)) {
    return { documentPrefix: true };
  }
  return document.length > DOCUMENT_MAX_LENGTH ? { documentLength: true } : null;
};

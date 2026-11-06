import { HttpErrorResponse } from '@angular/common/http';
import { MESSAGES } from '../../shared/i18n/messages.es-pe';
import { ApiError } from './api.models';

const NETWORK_ERROR = 'NETWORK_ERROR';

export function apiErrorCode(error: HttpErrorResponse): string | null {
  if (error.status === 0) {
    return NETWORK_ERROR;
  }
  const body = error.error as Partial<ApiError> | null;
  return typeof body?.error === 'string' ? body.error : null;
}

export function apiErrorMessage(error: HttpErrorResponse): string {
  const code = apiErrorCode(error);
  const known = code ? MESSAGES.errors[code as keyof typeof MESSAGES.errors] : undefined;
  return known ?? MESSAGES.errors.GENERIC;
}

import { HttpErrorResponse } from '@angular/common/http';
import { MESSAGES } from '../../shared/i18n/messages.es-pe';
import { apiErrorMessage } from './api-error';

const failure = (status: number, body: unknown) => new HttpErrorResponse({ status, error: body });

describe('apiErrorMessage', () => {
  it.each([
    ['KYC_UNAVAILABLE', 503],
    ['INVALID_REQUEST', 400],
    ['PAYLOAD_TOO_LARGE', 413],
    ['NOT_FOUND', 404],
  ])('Scenario: %s se muestra en español', (code, status) => {
    expect(apiErrorMessage(failure(status, { error: code }))).toBe(
      MESSAGES.errors[code as keyof typeof MESSAGES.errors],
    );
  });

  it('Scenario: Sin conexión', () => {
    expect(apiErrorMessage(failure(0, null))).toBe(MESSAGES.errors.NETWORK_ERROR);
  });

  it('Scenario: Código desconocido o cuerpo vacío', () => {
    expect(apiErrorMessage(failure(500, { error: 'ALGO_NUEVO' }))).toBe(MESSAGES.errors.GENERIC);
    expect(apiErrorMessage(failure(500, null))).toBe(MESSAGES.errors.GENERIC);
  });
});

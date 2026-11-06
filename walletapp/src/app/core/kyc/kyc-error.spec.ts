import { HttpErrorResponse } from '@angular/common/http';
import { describeKycError } from './kyc-error';

function httpError(status: number, body: unknown = null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body });
}

describe('describeKycError', () => {
  it('clasifica status 0 como problema de conexión', () => {
    const error = describeKycError(httpError(0));
    expect(error.kind).toBe('connection');
    expect(error.message).toContain('No pudimos conectarnos');
  });

  it('clasifica 400 como error de validación', () => {
    const error = describeKycError(httpError(400, { error: 'INVALID_INPUT' }));
    expect(error.kind).toBe('validation');
    expect(error.message).toContain('No pudimos validar tu registro');
    expect(error.message).not.toContain('TEST-');
  });

  it('clasifica 503 KYC_UNAVAILABLE como servicio no disponible', () => {
    const error = describeKycError(httpError(503, { error: 'KYC_UNAVAILABLE' }));
    expect(error.kind).toBe('unavailable');
    expect(error.message).toContain('no está disponible');
    expect(error.message).toContain('No se creó tu cuenta');
  });

  it('clasifica 429 como límite del grupo', () => {
    expect(describeKycError(httpError(429, { error: 'GROUP_LIMIT_RESET_REQUIRED' })).kind).toBe(
      'limit',
    );
  });

  it('404 PERSON_NOT_FOUND al activar: la persona no se encuentra', () => {
    const error = describeKycError(httpError(404, { error: 'PERSON_NOT_FOUND' }));

    expect(error.kind).toBe('not-found');
    expect(error.message).toContain('No encontramos a la persona');
  });

  it('422 DOCUMENT_MISMATCH: el documento no coincide con el registro', () => {
    const error = describeKycError(httpError(422, { error: 'DOCUMENT_MISMATCH' }));

    expect(error.kind).toBe('validation');
    expect(error.message).toContain('no coincide');
  });

  it('403 OTP_REQUIRED: falta verificar el código de seguridad', () => {
    const error = describeKycError(httpError(403, { error: 'OTP_REQUIRED' }));

    expect(error.kind).toBe('validation');
    expect(error.message).toContain('verificar tu código de seguridad');
  });

  it('410 OTP_EXPIRED: el código de seguridad venció', () => {
    const error = describeKycError(httpError(410, { error: 'OTP_EXPIRED' }));

    expect(error.message).toContain('venció');
  });

  it('un 404 o 422 sin el código esperado es un error desconocido', () => {
    expect(describeKycError(httpError(404, { error: 'NOT_FOUND' })).kind).toBe('unknown');
    expect(describeKycError(httpError(422)).kind).toBe('unknown');
  });

  it('devuelve un mensaje genérico para errores desconocidos', () => {
    expect(describeKycError(new Error('boom')).kind).toBe('unknown');
    expect(describeKycError(httpError(418)).kind).toBe('unknown');
  });
});

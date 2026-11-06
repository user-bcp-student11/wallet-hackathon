import { HttpErrorResponse } from '@angular/common/http';
import { KycError } from '../kyc/kyc-error';
import { ApiErrorBody } from '../kyc/kyc.model';

/**
 * Indica que el servidor respondió EXPLÍCITAMENTE que la persona no existe: 404 con el código
 * PERSON_NOT_FOUND. Un error de conexión, un 5xx o un 404 sin ese código (por ejemplo, una ruta
 * equivocada) NO significan que la persona no exista.
 */
export function isPersonNotFound(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status === 404 &&
    (error.error as Partial<ApiErrorBody> | null)?.error === 'PERSON_NOT_FOUND'
  );
}

/** Traduce un fallo de POST /persons/lookup a un mensaje claro, sin confundir fallos con ausencia. */
export function describePersonLookupError(error: unknown): KycError {
  if (isPersonNotFound(error)) {
    return {
      kind: 'not-found',
      message:
        'No encontramos a nadie con ese documento. Revisa el tipo y el número (en esta demostración solo hay personas ficticias).',
    };
  }

  const notTheirFault = 'Esto no significa que no estés registrado';

  if (!(error instanceof HttpErrorResponse)) {
    return unknown(notTheirFault);
  }

  if (error.status === 0) {
    return {
      kind: 'connection',
      message: `No pudimos consultar tu documento porque no hay conexión con el servicio. ${notTheirFault}: revisa tu conexión y vuelve a intentarlo.`,
    };
  }

  if (error.status === 400 || error.status === 413) {
    return {
      kind: 'validation',
      message: 'No pudimos validar los datos ingresados. Revisa el tipo y el número de documento.',
    };
  }

  if (error.status === 429) {
    return {
      kind: 'limit',
      message:
        'Se alcanzó el límite de consultas de este grupo de pruebas. Reinicia el grupo y vuelve a intentarlo.',
    };
  }

  if (error.status >= 500) {
    return {
      kind: 'unavailable',
      message: `El servicio de consulta no está disponible en este momento. ${notTheirFault}: vuelve a intentarlo en unos minutos.`,
    };
  }

  return unknown(notTheirFault);
}

function unknown(notTheirFault: string): KycError {
  return {
    kind: 'unknown',
    message: `No pudimos completar la consulta. ${notTheirFault}: vuelve a intentarlo.`,
  };
}

import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody } from './kyc.model';

export type KycErrorKind =
  'validation' | 'unavailable' | 'connection' | 'limit' | 'not-found' | 'unknown';

export interface KycError {
  kind: KycErrorKind;
  /** Mensaje en español, claro y orientado a qué hacer, para mostrar al usuario. */
  message: string;
}

/** Traduce un fallo de POST /kyc/verifications a un mensaje claro para el usuario. */
export function describeKycError(error: unknown): KycError {
  if (!(error instanceof HttpErrorResponse)) {
    return unknown();
  }

  // Estado 0: sin respuesta del servidor (red caída, servidor apagado, CORS o tiempo agotado).
  if (error.status === 0) {
    return {
      kind: 'connection',
      message:
        'No pudimos conectarnos con el servicio. Revisa tu conexión a internet y vuelve a intentarlo.',
    };
  }

  const code = (error.error as Partial<ApiErrorBody> | null)?.error;

  // Solo con userId: el servidor no reconoce a la persona (PERSON_NOT_FOUND explícito).
  if (error.status === 404 && code === 'PERSON_NOT_FOUND') {
    return {
      kind: 'not-found',
      message:
        'No encontramos a la persona para activar la wallet. Vuelve a consultar tu documento.',
    };
  }

  // Solo con userId: el tipo o el número no coinciden con los de la persona (DOCUMENT_MISMATCH).
  if (error.status === 422 && code === 'DOCUMENT_MISMATCH') {
    return {
      kind: 'validation',
      message:
        'El documento no coincide con el registro encontrado. Revisa el tipo y el número e inténtalo de nuevo.',
    };
  }

  // Solo con userId: falta un OTP verificado de esta persona, o venció.
  if (error.status === 403 && code === 'OTP_REQUIRED') {
    return {
      kind: 'validation',
      message:
        'Necesitamos verificar tu código de seguridad antes de activar. Vuelve a intentarlo para recibir uno nuevo.',
    };
  }
  if (error.status === 410 && code === 'OTP_EXPIRED') {
    return {
      kind: 'validation',
      message: 'El código de seguridad venció. Vuelve a intentarlo para recibir uno nuevo.',
    };
  }

  if (error.status === 400 || error.status === 413) {
    return {
      kind: 'validation',
      message:
        'No pudimos validar tu registro. Revisa el tipo y el número de documento y vuelve a intentarlo.',
    };
  }

  if (error.status === 429) {
    return {
      kind: 'limit',
      message:
        'Se alcanzó el límite de pruebas de este grupo. Reinicia el grupo y vuelve a intentarlo.',
    };
  }

  if (error.status === 503 || code === 'KYC_UNAVAILABLE' || error.status >= 500) {
    return {
      kind: 'unavailable',
      message:
        'El servicio de verificación no está disponible en este momento. No se creó tu cuenta, así que puedes volver a intentarlo en unos minutos.',
    };
  }

  return unknown();
}

function unknown(): KycError {
  return {
    kind: 'unknown',
    message: 'Algo salió mal de nuestro lado. Vuelve a intentarlo en unos minutos.',
  };
}

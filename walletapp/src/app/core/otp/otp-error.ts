import { HttpErrorResponse } from '@angular/common/http';
import { KycError } from '../kyc/kyc-error';
import { ApiErrorBody } from '../kyc/kyc.model';

export interface OtpError extends KycError {
  /** `true` si el código actual ya no sirve y hay que pedir uno nuevo. */
  requiresNewCode: boolean;
  /** Intentos que quedan (solo con código incorrecto). */
  attemptsRemaining?: number;
}

const codeOf = (error: HttpErrorResponse) => (error.error as Partial<ApiErrorBody> | null)?.error;

function generic(error: unknown): OtpError | undefined {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      kind: 'unknown',
      message: 'Algo salió mal. Vuelve a intentarlo en unos minutos.',
      requiresNewCode: false,
    };
  }
  if (error.status === 0) {
    return {
      kind: 'connection',
      message: 'No pudimos conectarnos con el servicio. Revisa tu conexión y vuelve a intentarlo.',
      requiresNewCode: false,
    };
  }
  if (error.status >= 500) {
    return {
      kind: 'unavailable',
      message:
        'El servicio de verificación no está disponible en este momento. Vuelve a intentarlo en unos minutos.',
      requiresNewCode: false,
    };
  }
  return undefined;
}

/** Errores de POST /otp/challenges (pedir el código). */
export function describeOtpRequestError(error: unknown): OtpError {
  const common = generic(error);
  if (common) {
    return common;
  }
  const http = error as HttpErrorResponse;
  if (http.status === 404 && codeOf(http) === 'PERSON_NOT_FOUND') {
    return {
      kind: 'not-found',
      message:
        'No encontramos a la persona para enviar el código. Vuelve a consultar tu documento.',
      requiresNewCode: false,
    };
  }
  if (http.status === 429) {
    return {
      kind: 'limit',
      message: 'Se alcanzó el límite de solicitudes. Espera un momento y vuelve a intentarlo.',
      requiresNewCode: false,
    };
  }
  return {
    kind: 'unknown',
    message: 'No pudimos generar el código. Vuelve a intentarlo.',
    requiresNewCode: false,
  };
}

/** Errores de POST /otp/challenges/{id}/verify (comprobar el código). */
export function describeOtpVerifyError(error: unknown): OtpError {
  const common = generic(error);
  if (common) {
    return common;
  }
  const http = error as HttpErrorResponse;
  const code = codeOf(http);

  if (http.status === 422 && code === 'OTP_INVALID') {
    const remaining = (http.error as { attemptsRemaining?: number }).attemptsRemaining;
    const left =
      typeof remaining === 'number'
        ? ` Te ${remaining === 1 ? 'queda 1 intento' : `quedan ${remaining} intentos`}.`
        : '';
    return {
      kind: 'validation',
      message: `El código no es correcto.${left}`,
      requiresNewCode: false,
      attemptsRemaining: remaining,
    };
  }
  if (http.status === 429 && code === 'OTP_ATTEMPTS_EXCEEDED') {
    return {
      kind: 'limit',
      message: 'Agotaste los intentos. Solicita un código nuevo para continuar.',
      requiresNewCode: true,
    };
  }
  if (http.status === 410 && code === 'OTP_EXPIRED') {
    return {
      kind: 'validation',
      message: 'El código venció. Solicita un código nuevo para continuar.',
      requiresNewCode: true,
    };
  }
  if (http.status === 404 && code === 'OTP_CHALLENGE_NOT_FOUND') {
    return {
      kind: 'validation',
      message: 'Este código ya no es válido porque se generó uno nuevo. Solicita un código nuevo.',
      requiresNewCode: true,
    };
  }
  if (http.status === 409 && code === 'OTP_ALREADY_USED') {
    return {
      kind: 'validation',
      message: 'Este código ya se usó. Solicita un código nuevo para continuar.',
      requiresNewCode: true,
    };
  }
  if (http.status === 400) {
    return {
      kind: 'validation',
      message: 'Ingresa el código de verificación.',
      requiresNewCode: false,
    };
  }
  return {
    kind: 'unknown',
    message: 'No pudimos verificar el código. Vuelve a intentarlo.',
    requiresNewCode: false,
  };
}

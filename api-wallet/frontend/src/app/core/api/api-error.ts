import { HttpErrorResponse } from '@angular/common/http';

/** Códigos que el cliente distingue además de los del contrato. */
export const NETWORK_ERROR = 'NETWORK';
export const UNKNOWN_ERROR = 'UNKNOWN';

/** Error normalizado de la API: el contrato responde `{"error": "CODE"}`. */
export interface ApiError {
  status: number;
  code: string;
}

/**
 * Convierte cualquier error HTTP en un `ApiError`.
 * - Sin respuesta (status 0): `NETWORK`.
 * - Cuerpo sin `error` (por ejemplo el formato por defecto de Spring): `UNKNOWN`.
 */
export function toApiError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return { status: 0, code: UNKNOWN_ERROR };
  }
  if (error.status === 0) {
    return { status: 0, code: NETWORK_ERROR };
  }
  const body: unknown = error.error;
  const code =
    typeof body === 'object' && body !== null && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : UNKNOWN_ERROR;
  return { status: error.status, code };
}

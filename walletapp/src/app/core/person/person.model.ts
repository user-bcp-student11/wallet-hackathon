import { IdentityDocumentType } from '../kyc/identity-document.model';

/** Cuerpo de POST /persons/lookup (esquema `PersonLookupRequest`). */
export interface PersonLookupRequest {
  documentType: IdentityDocumentType;
  /** Número FICTICIO. El contrato no fija longitud ni formato (pendiente de producto). */
  documentNumber: string;
}

/**
 * Respuesta 200 de POST /persons/lookup (esquema `PersonLookup`).
 * Solo contiene lo necesario para continuar: nombre, apellido y fecha de nacimiento no se exponen.
 */
export interface PersonLookupResponse {
  /** GUID de la persona. Se envía como `userId` al activar. */
  userId: string;
}

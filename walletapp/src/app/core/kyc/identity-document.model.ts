/**
 * Tipos de documento de identidad que la persona puede elegir en la interfaz.
 *
 * Longitud, caracteres permitidos y dígito verificador de DNI y CE están PENDIENTES de acordar con
 * producto: la aplicación no los valida (ver reglas-de-negocio/documento-de-identidad.md).
 */
export type IdentityDocumentType = 'DNI' | 'CE';

export const IDENTITY_DOCUMENT_TYPES: ReadonlyArray<{
  value: IdentityDocumentType;
  label: string;
}> = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carné de extranjería (CE)' },
];

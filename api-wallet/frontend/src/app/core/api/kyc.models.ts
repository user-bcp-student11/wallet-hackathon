// Tipos del contrato `backend/src/main/resources/openapi-wallet.yml` (tag "W1 · Registro y activación").

/** Escenarios que acepta `POST /kyc/verifications`. */
export const KYC_REQUEST_SCENARIOS = ['APPROVED', 'REJECTED', 'MANUAL_REVIEW', 'UNAVAILABLE'] as const;
export type KycRequestScenario = (typeof KYC_REQUEST_SCENARIOS)[number];

/** Escenarios que puede devolver el esquema `Kyc` (UNAVAILABLE nunca crea una verificación). */
export type KycScenario = Exclude<KycRequestScenario, 'UNAVAILABLE'>;

export type KycStatus = 'ACTIVE' | 'PENDING' | 'REJECTED';

/** Único tipo de documento que acepta el proveedor simulado. */
export const TEST_DOCUMENT_TYPE = 'TEST';
/** Prefijo obligatorio del documento simulado. */
export const TEST_DOCUMENT_PREFIX = 'TEST-';
/** Longitud máxima del documento que acepta el backend. */
export const DOCUMENT_MAX_LENGTH = 200;

/** Cuerpo de `POST /kyc/verifications`. `scenario` es opcional; el servidor aplica `APPROVED`. */
export interface CreateKycRequest {
  documentType: typeof TEST_DOCUMENT_TYPE;
  document: string;
  scenario?: KycRequestScenario;
}

/** Esquema `Kyc`. `id` es el ID de verificación y es distinto de `wallet_id`. */
export interface Kyc {
  id: string;
  wallet_id: string;
  scenario: KycScenario;
  status: KycStatus;
}

/** Esquema `Wallet`. Los importes son enteros en céntimos y `available = balance - reserved`. */
export interface Wallet {
  id: string;
  status: KycStatus;
  balance: number;
  reserved: number;
  available: number;
  currency: 'PEN';
}

// Tipos del contrato bcp-wallet-mock-openapi.yaml (W1 · Registro y activación).
import { IdentityDocumentType } from './identity-document.model';

/** Escenarios del proveedor simulado que admite el contrato. */
export type KycRequestScenario = 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'UNAVAILABLE';

/**
 * Cuerpo de POST /kyc/verifications para una persona (esquema `KycPersonRequest`).
 *
 * El contrato conserva además una forma heredada (`documentType: "TEST"` y `document: "TEST-…"`)
 * para clientes existentes; esta aplicación ya no la usa.
 */
export interface CreateKycVerificationRequest {
  /** GUID devuelto por POST /persons/lookup. */
  userId: string;
  documentType: IdentityDocumentType;
  /** Número de documento FICTICIO, tal como lo escribió la persona. No se valida formato. */
  document: string;
  /** challengeId de un OTP ya verificado de esta persona; se consume al activar. */
  otpChallengeId: string;
  /** Predeterminado APPROVED en el servidor. */
  scenario?: KycRequestScenario;
}

export type KycScenario = 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';

export type KycStatus = 'ACTIVE' | 'PENDING' | 'REJECTED';

/** Respuesta 200/201 de POST /kyc/verifications (esquema `Kyc`). */
export interface KycVerification {
  /** ID de verificación KYC. */
  id: string;
  /** ID de la wallet creada. */
  wallet_id: string;
  scenario: KycScenario;
  status: KycStatus;
}

/** Resultado de activar: 201 crea una wallet; 200 devuelve la que la persona ya tenía. */
export interface KycActivation {
  verification: KycVerification;
  /** `true` si la persona ya tenía una verificación y no se creó otra wallet (HTTP 200). */
  existing: boolean;
}

/** Cuerpo de error del contrato (esquema `Error`). */
export interface ApiErrorBody {
  /** Código estable del error, por ejemplo KYC_UNAVAILABLE o PERSON_NOT_FOUND. */
  error: string;
  processed?: boolean;
  paymentId?: string;
  status?: 'PENDING' | 'SUCCEEDED' | 'REJECTED' | 'REVERSED';
}

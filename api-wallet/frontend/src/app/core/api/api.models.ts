export type KycScenario = 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'UNAVAILABLE';
export type KycStatus = 'ACTIVE' | 'PENDING' | 'REJECTED';

export interface KycRequest {
  documentType: 'TEST';
  document: string;
  scenario: KycScenario;
}

export interface KycVerification {
  id: string;
  wallet_id: string;
  scenario: Exclude<KycScenario, 'UNAVAILABLE'>;
  status: KycStatus;
}

export interface Wallet {
  id: string;
  status: KycStatus;
  /** Importes en céntimos de PEN. */
  balance: number;
  reserved: number;
  available: number;
  currency: 'PEN';
}

export interface ApiError {
  error: string;
}

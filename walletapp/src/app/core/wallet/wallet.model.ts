// Tipos del contrato bcp-wallet-mock-openapi.yaml para GET /wallets/{id}.

export type WalletStatus = 'ACTIVE' | 'PENDING' | 'REJECTED';

/** Respuesta 200 de GET /wallets/{id} (esquema `Wallet`). Los importes están en céntimos. */
export interface Wallet {
  id: string;
  status: WalletStatus;
  /** Saldo contable en céntimos. */
  balance: number;
  /** Suma de pagos PENDING en céntimos. */
  reserved: number;
  /** balance menos reserved, en céntimos. */
  available: number;
  currency: 'PEN';
}

import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import { CreateKycVerificationRequest, KycActivation, KycVerification } from './kyc.model';

/** Datos de activación: el escenario lo fija esta clase (happy path). */
export type ActivateWalletInput = Omit<CreateKycVerificationRequest, 'scenario'>;

@Service()
export class KycApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * POST /kyc/verifications con una persona (userId + DNI/CE + número ficticio).
   *
   * El servidor comprueba que la persona exista y que su documento coincida. Con `APPROVED` crea
   * una wallet ACTIVE con saldo cero (201). Si la persona ya tenía una, no crea otra y devuelve la
   * existente (200): `existing` lo indica. Es una verificación simulada, no un KYC real.
   */
  activateWallet(input: ActivateWalletInput): Observable<KycActivation> {
    const request: CreateKycVerificationRequest = { ...input, scenario: 'APPROVED' };
    return this.http
      .post<KycVerification>(`${this.baseUrl}/kyc/verifications`, request, { observe: 'response' })
      .pipe(
        map((response) => ({
          verification: response.body as KycVerification,
          existing: response.status === 200,
        })),
      );
  }
}

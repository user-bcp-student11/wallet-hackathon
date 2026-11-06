import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { CreateKycRequest, Kyc } from './kyc.models';

/** Cliente de las operaciones KYC del contrato W1. */
@Injectable({ providedIn: 'root' })
export class KycApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** `POST /kyc/verifications`: crea la verificación y su wallet (201). */
  create(request: CreateKycRequest): Observable<Kyc> {
    return this.http.post<Kyc>(`${this.baseUrl}/kyc/verifications`, request);
  }

  /** `GET /kyc/verifications/{id}`: consulta una verificación por su ID kyc. */
  get(id: string): Observable<Kyc> {
    return this.http.get<Kyc>(`${this.baseUrl}/kyc/verifications/${encodeURIComponent(id)}`);
  }
}

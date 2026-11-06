import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { Wallet } from './kyc.models';

/** Cliente de la consulta de wallet del contrato W1. */
@Injectable({ providedIn: 'root' })
export class WalletApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** `GET /wallets/{id}`: estado y saldos en céntimos. */
  get(id: string): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.baseUrl}/wallets/${encodeURIComponent(id)}`);
  }
}

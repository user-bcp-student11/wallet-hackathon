import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import { Wallet } from './wallet.model';

@Service()
export class WalletApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** GET /wallets/{id}: estado y saldos de la wallet. */
  getWallet(id: string): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.baseUrl}/wallets/${encodeURIComponent(id)}`);
  }
}

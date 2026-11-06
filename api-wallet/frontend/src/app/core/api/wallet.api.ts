import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Wallet } from './api.models';
import { retryOnNetworkError } from './retry-on-network-error';

@Injectable({ providedIn: 'root' })
export class WalletApi {
  private readonly http = inject(HttpClient);

  getWallet(id: string): Observable<Wallet> {
    return this.http.get<Wallet>(`/wallets/${encodeURIComponent(id)}`).pipe(retryOnNetworkError());
  }
}

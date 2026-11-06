import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PaymentsAccess } from './api.models';

@Injectable({ providedIn: 'root' })
export class WalletApi {
  private readonly http = inject(HttpClient);

  paymentsAccess(): Observable<PaymentsAccess> {
    return this.http.get<PaymentsAccess>('/api/v1/wallet/payments-access');
  }
}

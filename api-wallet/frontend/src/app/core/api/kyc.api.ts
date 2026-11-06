import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { KycRequest, KycVerification } from './api.models';
import { retryOnNetworkError } from './retry-on-network-error';

@Injectable({ providedIn: 'root' })
export class KycApi {
  private readonly http = inject(HttpClient);

  createVerification(request: KycRequest): Observable<KycVerification> {
    return this.http.post<KycVerification>('/kyc/verifications', request);
  }

  getVerification(id: string): Observable<KycVerification> {
    return this.http
      .get<KycVerification>(`/kyc/verifications/${encodeURIComponent(id)}`)
      .pipe(retryOnNetworkError());
  }
}

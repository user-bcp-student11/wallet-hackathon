import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, retry, throwError, timer } from 'rxjs';
import { Onboarding, StepValues } from './api.models';

const NETWORK_RETRIES = 2;
const RETRY_DELAY_MS = 500;

function retryOnNetworkError<T>() {
  return retry<T>({
    count: NETWORK_RETRIES,
    delay: (error) => (error?.status === 0 ? timer(RETRY_DELAY_MS) : throwError(() => error)),
  });
}

@Injectable({ providedIn: 'root' })
export class OnboardingApi {
  private readonly http = inject(HttpClient);

  start(): Observable<Onboarding> {
    return this.http.post<Onboarding>('/api/v1/onboardings', null).pipe(retryOnNetworkError());
  }

  requestOtp(id: string, phoneNumber: string): Observable<void> {
    return this.http.post<void>(`/api/v1/onboardings/${id}/otp`, { phoneNumber });
  }

  submitStep(id: string, stepCode: string, values: StepValues): Observable<Onboarding> {
    return this.http
      .post<Onboarding>(`/api/v1/onboardings/${id}/steps/${stepCode}`, { values })
      .pipe(retryOnNetworkError());
  }
}

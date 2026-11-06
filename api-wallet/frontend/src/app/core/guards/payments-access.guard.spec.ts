import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { firstValueFrom, isObservable, Observable } from 'rxjs';
import { paymentsAccessGuard } from './payments-access.guard';

async function runGuard(respond: (http: HttpTestingController) => void): Promise<unknown> {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const result = TestBed.runInInjectionContext(() => paymentsAccessGuard({} as never, {} as never));
  if (!isObservable(result)) {
    throw new Error('Se esperaba un Observable');
  }
  const outcome = firstValueFrom(result as Observable<unknown>);
  respond(TestBed.inject(HttpTestingController));
  return outcome;
}

describe('paymentsAccessGuard', () => {
  it('Scenario: Wallet activa', async () => {
    const outcome = await runGuard((http) => http.expectOne('/api/v1/wallet/payments-access').flush({ enabled: true }));

    expect(outcome).toBe(true);
  });

  it('Scenario: Wallet no activa', async () => {
    const outcome = await runGuard((http) =>
      http.expectOne('/api/v1/wallet/payments-access').flush({}, { status: 403, statusText: 'Forbidden' }),
    );

    expect(outcome).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(outcome as UrlTree)).toBe('/onboarding');
  });
});

import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { retry } from 'rxjs';
import { idempotencyKeyInterceptor } from './idempotency-key.interceptor';

describe('idempotencyKeyInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([idempotencyKeyInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('Scenario: genera un UUID por intento de envío', () => {
    http.post('/api/v1/onboardings', null).subscribe();
    http.post('/api/v1/onboardings', null).subscribe();

    const [first, second] = controller.match('/api/v1/onboardings');
    const firstKey = first.request.headers.get('Idempotency-Key');
    const secondKey = second.request.headers.get('Idempotency-Key');

    expect(firstKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(secondKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(firstKey).not.toEqual(secondKey);
    first.flush({});
    second.flush({});
  });

  it('Scenario: reutiliza la clave en los reintentos del mismo envío', () => {
    http.post('/api/v1/onboardings', null).pipe(retry(1)).subscribe({ error: () => undefined });

    const first = controller.expectOne('/api/v1/onboardings');
    const firstKey = first.request.headers.get('Idempotency-Key');
    first.error(new ProgressEvent('error'));

    const retried = controller.expectOne('/api/v1/onboardings');
    expect(retried.request.headers.get('Idempotency-Key')).toEqual(firstKey);
    retried.flush({});
  });

  it('Scenario: no agrega la clave a las consultas', () => {
    http.get('/api/v1/wallet/payments-access').subscribe();

    const request = controller.expectOne('/api/v1/wallet/payments-access');
    expect(request.request.headers.has('Idempotency-Key')).toBe(false);
    request.flush({});
  });
});

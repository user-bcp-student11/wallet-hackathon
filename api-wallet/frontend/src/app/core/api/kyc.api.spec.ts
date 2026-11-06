import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { KycRequest } from './api.models';
import { KycApi } from './kyc.api';

const REQUEST: KycRequest = { documentType: 'TEST', document: 'TEST-001', scenario: 'APPROVED' };

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { api: TestBed.inject(KycApi), http: TestBed.inject(HttpTestingController) };
}

describe('KycApi', () => {
  it('Scenario: Creación envía el contrato sin cabeceras del flujo anterior', () => {
    const { api, http } = setup();
    const created = { id: 'kyc-1', wallet_id: 'wal-1', scenario: 'APPROVED', status: 'ACTIVE' };
    let response: unknown;

    api.createVerification(REQUEST).subscribe((value) => (response = value));
    const call = http.expectOne('/kyc/verifications');
    call.flush(created, { status: 201, statusText: 'Created' });

    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(REQUEST);
    expect(call.request.headers.has('Idempotency-Key')).toBe(false);
    expect(call.request.headers.has('X-User-Id')).toBe(false);
    expect(response).toEqual(created);
  });

  it('Scenario: Verificación existente se consulta por su ID kyc', () => {
    const { api, http } = setup();
    let response: unknown;

    api.getVerification('kyc-1').subscribe((value) => (response = value));
    const call = http.expectOne('/kyc/verifications/kyc-1');
    call.flush({ id: 'kyc-1', wallet_id: 'wal-1', scenario: 'APPROVED', status: 'ACTIVE' });

    expect(call.request.method).toBe('GET');
    expect(response).toMatchObject({ id: 'kyc-1', status: 'ACTIVE' });
  });

  it('Scenario: La creación no se reintenta ante un error de red', () => {
    const { api, http } = setup();
    let failed = false;

    api.createVerification(REQUEST).subscribe({ error: () => (failed = true) });
    http.expectOne('/kyc/verifications').error(new ProgressEvent('error'));

    expect(failed).toBe(true);
    http.expectNone('/kyc/verifications');
  });
});

import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NETWORK_ERROR, UNKNOWN_ERROR, toApiError } from './api-error';
import { KycApi } from './kyc.api';
import { Kyc, Wallet } from './kyc.models';
import { WalletApi } from './wallet.api';

describe('Cliente HTTP del contrato W1', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crea la verificación con POST /kyc/verifications y solo el cuerpo del contrato', () => {
    const kyc: Kyc = { id: 'kyc-1', wallet_id: 'wallet-1', scenario: 'APPROVED', status: 'ACTIVE' };
    let result: Kyc | undefined;

    TestBed.inject(KycApi)
      .create({ documentType: 'TEST', document: 'TEST-001', scenario: 'APPROVED' })
      .subscribe((value) => (result = value));

    const req = http.expectOne('/kyc/verifications');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ documentType: 'TEST', document: 'TEST-001', scenario: 'APPROVED' });
    expect(req.request.headers.has('Idempotency-Key')).toBe(false);
    expect(req.request.headers.has('X-User-Id')).toBe(false);
    req.flush(kyc, { status: 201, statusText: 'Created' });

    expect(result).toEqual(kyc);
  });

  it('consulta la verificación con GET /kyc/verifications/{id}', () => {
    TestBed.inject(KycApi).get('kyc-1').subscribe();
    const req = http.expectOne('/kyc/verifications/kyc-1');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'kyc-1', wallet_id: 'wallet-1', scenario: 'MANUAL_REVIEW', status: 'PENDING' });
  });

  it('consulta la wallet con GET /wallets/{id}', () => {
    const wallet: Wallet = {
      id: 'wallet-demo',
      status: 'ACTIVE',
      balance: 100000,
      reserved: 0,
      available: 100000,
      currency: 'PEN',
    };
    let result: Wallet | undefined;
    TestBed.inject(WalletApi)
      .get('wallet-demo')
      .subscribe((value) => (result = value));

    const req = http.expectOne('/wallets/wallet-demo');
    expect(req.request.method).toBe('GET');
    req.flush(wallet);
    expect(result).toEqual(wallet);
  });
});

describe('toApiError', () => {
  it('toma el código del cuerpo {"error": "CODE"}', () => {
    const error = new HttpErrorResponse({ status: 503, error: { error: 'KYC_UNAVAILABLE' } });
    expect(toApiError(error)).toEqual({ status: 503, code: 'KYC_UNAVAILABLE' });
  });

  it('trata la falta de respuesta como error de red', () => {
    expect(toApiError(new HttpErrorResponse({ status: 0 }))).toEqual({ status: 0, code: NETWORK_ERROR });
  });

  it('trata un cuerpo sin código como error desconocido', () => {
    const error = new HttpErrorResponse({ status: 500, error: { timestamp: 'x', status: 500, path: '/kyc' } });
    expect(toApiError(error)).toEqual({ status: 500, code: UNKNOWN_ERROR });
  });
});

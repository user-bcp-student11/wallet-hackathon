import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api-base-url';
import { KycApi } from './kyc-api';
import { KycVerification } from './kyc.model';

const URL = 'http://mock.test/kyc/verifications';
const USER_ID = '11111111-2222-4333-8444-555555555555';
const RESPONSE: KycVerification = {
  id: 'kyc-1',
  wallet_id: 'wallet-1',
  scenario: 'APPROVED',
  status: 'ACTIVE',
};

describe('KycApi.activateWallet', () => {
  let api: KycApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://mock.test' },
      ],
    });
    api = TestBed.inject(KycApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  for (const [type, number] of [
    ['DNI', '00000001'],
    ['CE', 'ABC-0002'],
  ] as const) {
    it(`envía POST /kyc/verifications con userId, ${type}, el número, otpChallengeId y scenario APPROVED`, () => {
      api
        .activateWallet({
          userId: USER_ID,
          documentType: type,
          document: number,
          otpChallengeId: 'otp-1',
        })
        .subscribe();

      const req = http.expectOne(URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        userId: USER_ID,
        documentType: type,
        document: number,
        otpChallengeId: 'otp-1',
        scenario: 'APPROVED',
      });
      req.flush(RESPONSE, { status: 201, statusText: 'Created' });
    });
  }

  it('no usa la forma heredada TEST ni prefijos técnicos', () => {
    api
      .activateWallet({
        userId: USER_ID,
        documentType: 'DNI',
        document: '00000001',
        otpChallengeId: 'otp-1',
      })
      .subscribe();

    const req = http.expectOne(URL);
    const body = JSON.stringify(req.request.body);
    expect(body).not.toContain('TEST');
    expect(body).not.toMatch(/(DNI|CE)-/);
    req.flush(RESPONSE, { status: 201, statusText: 'Created' });
  });

  it('201: devuelve la verificación nueva (existing = false)', () => {
    let result: { verification: KycVerification; existing: boolean } | undefined;

    api
      .activateWallet({
        userId: USER_ID,
        documentType: 'DNI',
        document: '00000001',
        otpChallengeId: 'otp-1',
      })
      .subscribe((value) => (result = value));
    http.expectOne(URL).flush(RESPONSE, { status: 201, statusText: 'Created' });

    expect(result).toEqual({ verification: RESPONSE, existing: false });
  });

  it('200: la persona ya tenía wallet, se devuelve la existente (existing = true)', () => {
    let result: { verification: KycVerification; existing: boolean } | undefined;

    api
      .activateWallet({
        userId: USER_ID,
        documentType: 'DNI',
        document: '00000001',
        otpChallengeId: 'otp-1',
      })
      .subscribe((value) => (result = value));
    http.expectOne(URL).flush(RESPONSE, { status: 200, statusText: 'OK' });

    expect(result).toEqual({ verification: RESPONSE, existing: true });
  });
});

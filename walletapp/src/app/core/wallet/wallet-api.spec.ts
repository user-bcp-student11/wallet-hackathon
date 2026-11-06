import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api-base-url';
import { WalletApi } from './wallet-api';
import { Wallet } from './wallet.model';

describe('WalletApi', () => {
  let api: WalletApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://mock.test' },
      ],
    });
    api = TestBed.inject(WalletApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta GET /wallets/{id} a la URL base configurada', () => {
    const wallet: Wallet = {
      id: 'wallet-1',
      status: 'ACTIVE',
      balance: 0,
      reserved: 0,
      available: 0,
      currency: 'PEN',
    };
    let received: Wallet | undefined;

    api.getWallet('wallet-1').subscribe((value) => (received = value));

    const req = http.expectOne('http://mock.test/wallets/wallet-1');
    expect(req.request.method).toBe('GET');
    req.flush(wallet);
    expect(received).toEqual(wallet);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Wallet } from './api.models';
import { WalletApi } from './wallet.api';

const WALLET: Wallet = {
  id: 'wallet-demo',
  status: 'ACTIVE',
  balance: 100000,
  reserved: 0,
  available: 100000,
  currency: 'PEN',
};

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { api: TestBed.inject(WalletApi), http: TestBed.inject(HttpTestingController) };
}

describe('WalletApi', () => {
  it('Scenario: Wallet precargada se consulta por su ID', () => {
    const { api, http } = setup();
    let response: unknown;

    api.getWallet('wallet-demo').subscribe((value) => (response = value));
    const call = http.expectOne('/wallets/wallet-demo');
    call.flush(WALLET);

    expect(call.request.method).toBe('GET');
    expect(call.request.headers.has('X-User-Id')).toBe(false);
    expect(response).toEqual(WALLET);
  });

  it('Scenario: Wallet inexistente propaga el error NOT_FOUND', () => {
    const { api, http } = setup();
    let status = 0;

    api.getWallet('nope').subscribe({ error: (error) => (status = error.status) });
    http.expectOne('/wallets/nope').flush({ error: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' });

    expect(status).toBe(404);
  });
});

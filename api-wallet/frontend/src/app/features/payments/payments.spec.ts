import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Wallet } from '../../core/api/kyc.models';
import { MESSAGES } from '../../core/i18n/messages.es-pe';
import { OnboardingStore } from '../onboarding/onboarding.store';
import { activeWalletGuard } from './active-wallet.guard';
import { PaymentsPage } from './payments.page';

describe('Punto de entrada de pagos', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'registro', children: [] },
          { path: 'pagos', canActivate: [activeWalletGuard], component: PaymentsPage },
        ]),
      ],
    });
  });

  const setWallet = (status: Wallet['status']) =>
    TestBed.inject(OnboardingStore).wallet.set({
      id: 'wallet-1',
      status,
      balance: 100000,
      reserved: 0,
      available: 100000,
      currency: 'PEN',
    });

  it('con wallet ACTIVE muestra el saldo disponible y los accesos de pago', async () => {
    setWallet('ACTIVE');
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/pagos', PaymentsPage);
    const el = harness.routeNativeElement!;

    expect(page).toBeInstanceOf(PaymentsPage);
    expect(el.querySelector('[data-testid="payments-available"]')?.textContent).toMatch(/S\/\s?1,000\.00/);
    expect(el.textContent).toContain(MESSAGES.payments.qr);
    expect(el.textContent).toContain(MESSAGES.payments.transfer);
  });

  for (const status of [null, 'PENDING', 'REJECTED'] as const) {
    it(`sin wallet activa (${status ?? 'sin wallet'}) redirige al registro`, async () => {
      if (status) setWallet(status);
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/pagos');
      expect(TestBed.inject(Router).url).toBe('/registro');
    });
  }
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Kyc, KycRequestScenario, Wallet } from '../../core/api/kyc.models';
import { MESSAGES, errorMessage } from '../../core/i18n/messages.es-pe';
import { RegistrationPage } from './registration.page';

function kyc(status: Kyc['status'], scenario: Kyc['scenario'], id = 'kyc-1'): Kyc {
  return { id, wallet_id: 'wallet-1', scenario, status };
}

function wallet(status: Wallet['status']): Wallet {
  return { id: 'wallet-1', status, balance: 0, reserved: 0, available: 0, currency: 'PEN' };
}

describe('RegistrationPage', () => {
  let fixture: ComponentFixture<RegistrationPage>;
  let http: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrationPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RegistrationPage);
    el = fixture.nativeElement as HTMLElement;
    document.body.appendChild(el);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    el.remove();
  });

  const documentInput = () => el.querySelector<HTMLInputElement>('#document')!;
  const scenarioSelect = () => el.querySelector<HTMLSelectElement>('#scenario')!;
  const text = () => el.textContent ?? '';

  async function fill(document: string, scenario: KycRequestScenario = 'APPROVED') {
    documentInput().value = document;
    documentInput().dispatchEvent(new Event('input'));
    scenarioSelect().value = scenario;
    scenarioSelect().dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  async function submit() {
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  async function respondCreate(body: Kyc, walletBody: Wallet) {
    http.expectOne({ method: 'POST', url: '/kyc/verifications' }).flush(body, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    http.expectOne(`/wallets/${body.wallet_id}`).flush(walletBody);
    await fixture.whenStable();
  }

  describe('Entrada inválida', () => {
    it('bloquea el envío sin prefijo TEST-, muestra el error y lleva el foco al campo', async () => {
      await fill('12345678');
      await submit();

      http.expectNone('/kyc/verifications');
      const input = documentInput();
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toContain('document-error');
      expect(el.querySelector('#document-error')?.textContent).toContain(MESSAGES.validation.documentPrefix);
      expect(document.activeElement).toBe(input);
    });

    it('bloquea el envío con el documento vacío', async () => {
      await fill('');
      await submit();

      http.expectNone('/kyc/verifications');
      expect(el.querySelector('#document-error')?.textContent).toContain(MESSAGES.validation.documentRequired);
    });

    it('muestra el 400 INVALID_REQUEST del servidor y conserva lo ingresado', async () => {
      await fill('TEST-001');
      await submit();

      http
        .expectOne('/kyc/verifications')
        .flush({ error: 'INVALID_REQUEST' }, { status: 400, statusText: 'Bad Request' });
      await fixture.whenStable();

      const alert = el.querySelector<HTMLElement>('[data-testid="server-error"]')!;
      expect(alert.getAttribute('role')).toBe('alert');
      expect(alert.textContent).toContain(errorMessage('INVALID_REQUEST'));
      expect(documentInput().value).toBe('TEST-001');
      expect(document.activeElement).toBe(alert);
    });
  });

  describe('Proveedor no disponible', () => {
    it('muestra el mensaje de 503 y permite reintentar hasta crear la wallet', async () => {
      await fill('TEST-001', 'UNAVAILABLE');
      await submit();

      const req = http.expectOne('/kyc/verifications');
      expect(req.request.body).toEqual({ documentType: 'TEST', document: 'TEST-001', scenario: 'UNAVAILABLE' });
      req.flush({ error: 'KYC_UNAVAILABLE' }, { status: 503, statusText: 'Service Unavailable' });
      await fixture.whenStable();

      expect(text()).toContain(errorMessage('KYC_UNAVAILABLE'));
      http.expectNone('/wallets/wallet-1');

      await fill('TEST-001', 'APPROVED');
      const retry = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(MESSAGES.registration.retry))!;
      retry.click();
      await fixture.whenStable();

      await respondCreate(kyc('ACTIVE', 'APPROVED'), wallet('ACTIVE'));
      expect(text()).toContain(MESSAGES.result.activeTitle);
    });
  });

  describe('Escenario aprobado', () => {
    it('muestra la wallet activa con su saldo y mueve el foco al resultado', async () => {
      await fill('TEST-001', 'APPROVED');
      await submit();
      await respondCreate(kyc('ACTIVE', 'APPROVED'), wallet('ACTIVE'));

      const heading = el.querySelector<HTMLElement>('#result-title')!;
      expect(heading.textContent).toContain(MESSAGES.result.activeTitle);
      expect(el.querySelector('[data-testid="wallet-status"]')?.textContent).toContain(MESSAGES.status.ACTIVE);
      expect(el.querySelector('[data-testid="wallet-balance"]')?.textContent).toMatch(/S\/\s?0\.00/);
      expect(document.activeElement).toBe(heading);
    });
  });

  describe('Revisión manual', () => {
    it('explica que falta una decisión y permite actualizar el estado', async () => {
      await fill('TEST-002', 'MANUAL_REVIEW');
      await submit();
      await respondCreate(kyc('PENDING', 'MANUAL_REVIEW'), wallet('PENDING'));

      expect(text()).toContain(MESSAGES.result.pendingTitle);
      expect(text()).toContain(MESSAGES.result.pendingBody);
      expect(el.querySelector('[data-testid="kyc-id"]')?.textContent).toContain('kyc-1');

      const refresh = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(MESSAGES.result.refresh))!;
      refresh.click();
      await fixture.whenStable();

      http.expectOne({ method: 'GET', url: '/kyc/verifications/kyc-1' }).flush(kyc('ACTIVE', 'MANUAL_REVIEW'));
      await fixture.whenStable();
      http.expectOne('/wallets/wallet-1').flush(wallet('ACTIVE'));
      await fixture.whenStable();

      expect(text()).toContain(MESSAGES.result.activeTitle);
    });
  });

  describe('Escenario rechazado', () => {
    it('informa el rechazo y permite volver al formulario', async () => {
      await fill('TEST-003', 'REJECTED');
      await submit();
      await respondCreate(kyc('REJECTED', 'REJECTED'), wallet('REJECTED'));

      expect(text()).toContain(MESSAGES.result.rejectedTitle);
      expect(el.querySelector('[data-testid="wallet-status"]')?.textContent).toContain(MESSAGES.status.REJECTED);

      const tryAgain = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(MESSAGES.result.tryAgain))!;
      tryAgain.click();
      await fixture.whenStable();

      expect(el.querySelector('form')).not.toBeNull();
    });
  });

  describe('Accesibilidad', () => {
    it('cada control tiene etiqueta y descripción', () => {
      for (const id of ['documentType', 'document', 'scenario']) {
        expect(el.querySelector(`label[for="${id}"]`)).not.toBeNull();
        const describedBy = el.querySelector(`#${id}`)!.getAttribute('aria-describedby')!;
        for (const ref of describedBy.split(' ')) {
          expect(el.querySelector(`#${ref}`)).not.toBeNull();
        }
      }
    });

    it('ofrece los cuatro escenarios del contrato con textos del catálogo', () => {
      const options = [...scenarioSelect().options].map((o) => o.textContent?.trim());
      expect(options).toEqual(Object.values(MESSAGES.scenarios));
    });
  });
});

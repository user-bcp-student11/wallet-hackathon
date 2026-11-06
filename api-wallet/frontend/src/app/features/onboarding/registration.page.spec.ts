import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ANALYTICS_SINK, OnboardingAnalytics, OnboardingEvent } from '../../core/analytics/onboarding-analytics';
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
  let sent: OnboardingEvent[];

  beforeEach(async () => {
    sent = [];
    await TestBed.configureTestingModule({
      imports: [RegistrationPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ANALYTICS_SINK, useValue: { send: (e: OnboardingEvent) => sent.push(e) } },
      ],
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
  const stepCount = () => el.querySelector('[data-testid="step-count"]')?.textContent ?? '';
  const button = (label: string) => [...el.querySelectorAll('button, a')].find((b) => b.textContent?.includes(label)) as HTMLElement;
  const eventNames = () => sent.map((e) => (e.name === 'step_completed' ? `${e.name}:${e.step}` : e.name));

  async function submitForm() {
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  /** Paso 1: ingresa el documento y continúa. */
  async function completeData(document: string) {
    documentInput().value = document;
    documentInput().dispatchEvent(new Event('input'));
    await submitForm();
  }

  /** Paso 2: elige el escenario y verifica. */
  async function verify(scenario: KycRequestScenario) {
    scenarioSelect().value = scenario;
    scenarioSelect().dispatchEvent(new Event('change'));
    await submitForm();
  }

  async function respondCreate(body: Kyc, walletBody: Wallet) {
    http.expectOne({ method: 'POST', url: '/kyc/verifications' }).flush(body, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    http.expectOne(`/wallets/${body.wallet_id}`).flush(walletBody);
    await fixture.whenStable();
  }

  describe('Secuencia de pasos', () => {
    it('muestra los tres pasos y el paso actual en cada etapa', async () => {
      const items = () => [...el.querySelectorAll('.steps__list li')];
      const names = items().map((li) => li.querySelector('.step__name')?.firstChild?.textContent?.trim());
      expect(names).toEqual([...MESSAGES.steps.names]);
      expect(stepCount()).toContain('Paso 1 de 3');
      expect(items()[0].getAttribute('aria-current')).toBe('step');

      await completeData('TEST-001');
      expect(stepCount()).toContain('Paso 2 de 3');
      expect(items()[1].getAttribute('aria-current')).toBe('step');
      expect(el.querySelector('[data-testid="summary-document"]')?.textContent).toContain('TEST-001');

      await verify('APPROVED');
      await respondCreate(kyc('ACTIVE', 'APPROVED'), wallet('ACTIVE'));
      expect(stepCount()).toContain('Paso 3 de 3');
      expect(items()[2].getAttribute('aria-current')).toBe('step');
    });

    it('permite volver al paso 1 conservando el documento', async () => {
      await completeData('TEST-001');
      button(MESSAGES.registration.editData).click();
      await fixture.whenStable();

      expect(stepCount()).toContain('Paso 1 de 3');
      expect(documentInput().value).toBe('TEST-001');
    });
  });

  describe('Entrada inválida', () => {
    it('bloquea el avance sin prefijo TEST-, muestra un mensaje accionable y enfoca el campo', async () => {
      await completeData('12345678');

      expect(stepCount()).toContain('Paso 1 de 3');
      const input = documentInput();
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toContain('document-error');
      expect(el.querySelector('#document-error')?.textContent).toContain(MESSAGES.validation.documentPrefix);
      expect(document.activeElement).toBe(input);
    });

    it('bloquea el avance con el documento vacío', async () => {
      await completeData('');
      expect(stepCount()).toContain('Paso 1 de 3');
      expect(el.querySelector('#document-error')?.textContent).toContain(MESSAGES.validation.documentRequired);
    });

    it('muestra el 400 INVALID_REQUEST y ofrece corregir los datos', async () => {
      await completeData('TEST-001');
      await verify('APPROVED');
      http
        .expectOne('/kyc/verifications')
        .flush({ error: 'INVALID_REQUEST' }, { status: 400, statusText: 'Bad Request' });
      await fixture.whenStable();

      const alert = el.querySelector<HTMLElement>('[data-testid="server-error"]')!;
      expect(alert.getAttribute('role')).toBe('alert');
      expect(alert.textContent).toContain(errorMessage('INVALID_REQUEST'));
      expect(document.activeElement).toBe(alert);

      button(MESSAGES.registration.fixData).click();
      await fixture.whenStable();
      expect(stepCount()).toContain('Paso 1 de 3');
      expect(documentInput().value).toBe('TEST-001');
    });
  });

  describe('Proveedor no disponible', () => {
    it('muestra el mensaje de 503 y permite reintentar hasta crear la wallet', async () => {
      await completeData('TEST-001');
      await verify('UNAVAILABLE');

      const req = http.expectOne('/kyc/verifications');
      expect(req.request.body).toEqual({ documentType: 'TEST', document: 'TEST-001', scenario: 'UNAVAILABLE' });
      req.flush({ error: 'KYC_UNAVAILABLE' }, { status: 503, statusText: 'Service Unavailable' });
      await fixture.whenStable();
      expect(text()).toContain(errorMessage('KYC_UNAVAILABLE'));
      expect(stepCount()).toContain('Paso 2 de 3');

      scenarioSelect().value = 'APPROVED';
      scenarioSelect().dispatchEvent(new Event('change'));
      button(MESSAGES.registration.retry).click();
      await fixture.whenStable();

      await respondCreate(kyc('ACTIVE', 'APPROVED'), wallet('ACTIVE'));
      expect(text()).toContain(MESSAGES.result.activeTitle);
    });
  });

  describe('Escenario aprobado', () => {
    it('muestra la wallet activa, el acceso a pagos y mueve el foco al resultado', async () => {
      await completeData('TEST-001');
      await verify('APPROVED');
      await respondCreate(kyc('ACTIVE', 'APPROVED'), wallet('ACTIVE'));

      const heading = el.querySelector<HTMLElement>('#result-title')!;
      expect(heading.textContent).toContain(MESSAGES.result.activeTitle);
      expect(el.querySelector('[data-testid="wallet-status"]')?.textContent).toContain(MESSAGES.status.ACTIVE);
      expect(el.querySelector('[data-testid="wallet-available"]')?.textContent).toMatch(/S\/\s?0\.00/);
      expect(button(MESSAGES.result.goToPayments).getAttribute('href')).toBe('/pagos');
      expect(document.activeElement).toBe(heading);
    });
  });

  describe('Revisión manual', () => {
    it('explica que falta una decisión, sin acceso a pagos, y permite actualizar el estado', async () => {
      await completeData('TEST-002');
      await verify('MANUAL_REVIEW');
      await respondCreate(kyc('PENDING', 'MANUAL_REVIEW'), wallet('PENDING'));

      expect(text()).toContain(MESSAGES.result.pendingTitle);
      expect(text()).toContain(MESSAGES.result.pendingBody);
      expect(button(MESSAGES.result.goToPayments)).toBeUndefined();

      button(MESSAGES.result.refresh).click();
      await fixture.whenStable();
      http.expectOne({ method: 'GET', url: '/kyc/verifications/kyc-1' }).flush(kyc('ACTIVE', 'MANUAL_REVIEW'));
      await fixture.whenStable();
      http.expectOne('/wallets/wallet-1').flush(wallet('ACTIVE'));
      await fixture.whenStable();

      expect(text()).toContain(MESSAGES.result.activeTitle);
      expect(button(MESSAGES.result.goToPayments)).toBeDefined();
    });
  });

  describe('Escenario rechazado', () => {
    it('informa el rechazo y permite volver a empezar', async () => {
      await completeData('TEST-003');
      await verify('REJECTED');
      await respondCreate(kyc('REJECTED', 'REJECTED'), wallet('REJECTED'));

      expect(text()).toContain(MESSAGES.result.rejectedTitle);
      expect(button(MESSAGES.result.goToPayments)).toBeUndefined();

      button(MESSAGES.result.tryAgain).click();
      await fixture.whenStable();
      expect(stepCount()).toContain('Paso 1 de 3');
    });
  });

  describe('Analítica', () => {
    it('registra inicio, fin de cada paso y cierre activado, sin el documento', async () => {
      await completeData('TEST-001');
      await verify('APPROVED');
      await respondCreate(kyc('ACTIVE', 'APPROVED'), wallet('ACTIVE'));

      expect(eventNames()).toEqual([
        'onboarding_started',
        'step_completed:datos',
        'step_completed:verificacion',
        'step_completed:wallet',
        'flow_closed',
      ]);
      expect(sent.at(-1)).toMatchObject({ name: 'flow_closed', outcome: 'activated' });
      expect(JSON.stringify(sent)).not.toContain('TEST-001');
      expect(JSON.stringify(sent)).not.toContain('wallet-1');
    });

    it('registra el cierre por rechazo', async () => {
      await completeData('TEST-003');
      await verify('REJECTED');
      await respondCreate(kyc('REJECTED', 'REJECTED'), wallet('REJECTED'));
      expect(sent.at(-1)).toMatchObject({ name: 'flow_closed', outcome: 'rejected', lastStep: 'wallet' });
    });

    it('registra el abandono al salir del flujo sin terminar', async () => {
      await completeData('TEST-001');
      fixture.destroy();
      expect(sent.at(-1)).toMatchObject({ name: 'flow_closed', outcome: 'abandoned', lastStep: 'verificacion' });
      expect(TestBed.inject(OnboardingAnalytics).active).toBe(false);
    });
  });

  describe('Accesibilidad', () => {
    it('cada control tiene etiqueta y descripción', async () => {
      const check = (ids: string[]) => {
        for (const id of ids) {
          expect(el.querySelector(`label[for="${id}"]`)).not.toBeNull();
          const describedBy = el.querySelector(`#${id}`)!.getAttribute('aria-describedby')!;
          for (const ref of describedBy.split(' ')) expect(el.querySelector(`#${ref}`)).not.toBeNull();
        }
      };
      check(['documentType', 'document']);
      await completeData('TEST-001');
      check(['scenario']);
    });

    it('ofrece los cuatro escenarios del contrato con textos del catálogo', async () => {
      await completeData('TEST-001');
      const options = [...scenarioSelect().options].map((o) => o.textContent?.trim());
      expect(options).toEqual(Object.values(MESSAGES.scenarios));
    });
  });
});

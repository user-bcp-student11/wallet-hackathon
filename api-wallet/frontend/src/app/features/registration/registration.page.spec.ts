import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MESSAGES } from '../../shared/i18n/messages.es-pe';
import { RegistrationPage } from './registration.page';

type Fixture = ComponentFixture<RegistrationPage>;

function render() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const fixture = TestBed.createComponent(RegistrationPage);
  fixture.detectChanges();
  return { fixture, http: TestBed.inject(HttpTestingController), element: fixture.nativeElement as HTMLElement };
}

function register(fixture: Fixture, scenario: string, document = 'TEST-001'): void {
  const element = fixture.nativeElement as HTMLElement;
  const input = element.querySelector<HTMLInputElement>('#document')!;
  input.value = document;
  input.dispatchEvent(new Event('input'));
  const select = element.querySelector<HTMLSelectElement>('#scenario')!;
  select.value = scenario;
  select.dispatchEvent(new Event('change'));
  element.querySelector('form')!.dispatchEvent(new Event('submit'));
  fixture.detectChanges();
}

function completeRegistration(
  fixture: Fixture,
  http: HttpTestingController,
  status: string,
  wallet: { balance: number; available: number } = { balance: 0, available: 0 },
): TestRequest {
  const create = http.expectOne('/kyc/verifications');
  create.flush({ id: 'kyc-1', wallet_id: 'wal-1', scenario: 'APPROVED', status }, { status: 201, statusText: 'Created' });
  http
    .expectOne('/kyc/verifications/kyc-1')
    .flush({ id: 'kyc-1', wallet_id: 'wal-1', scenario: 'APPROVED', status });
  http
    .expectOne('/wallets/wal-1')
    .flush({ id: 'wal-1', status, reserved: 0, currency: 'PEN', ...wallet });
  fixture.detectChanges();
  return create;
}

describe('RegistrationPage', () => {
  it('Scenario: Escenario aprobado muestra la wallet activa', () => {
    const { fixture, http, element } = render();

    register(fixture, 'APPROVED');
    const create = completeRegistration(fixture, http, 'ACTIVE', { balance: 0, available: 0 });

    expect(create.request.body).toEqual({ documentType: 'TEST', document: 'TEST-001', scenario: 'APPROVED' });
    expect(element.querySelector('h2')?.textContent).toBe(MESSAGES.result.ACTIVE.title);
    expect(element.querySelector('dl')?.textContent).toContain('S/');
    expect(element.querySelector('dl')?.textContent).toContain(MESSAGES.result.walletStatusLabels.ACTIVE);
  });

  it('Scenario: Revisión manual explica que falta una decisión', () => {
    const { fixture, http, element } = render();

    register(fixture, 'MANUAL_REVIEW');
    completeRegistration(fixture, http, 'PENDING');

    expect(element.querySelector('h2')?.textContent).toBe(MESSAGES.result.PENDING.title);
    expect(element.textContent).toContain(MESSAGES.result.PENDING.description);
    expect(element.querySelector('button.secondary')?.textContent).toBe(MESSAGES.actions.refresh);
    expect(element.querySelector('dl')?.textContent).not.toContain(MESSAGES.result.available);
  });

  it('Scenario: Escenario rechazado informa el rechazo', () => {
    const { fixture, http, element } = render();

    register(fixture, 'REJECTED');
    completeRegistration(fixture, http, 'REJECTED');

    expect(element.querySelector('h2')?.textContent).toBe(MESSAGES.result.REJECTED.title);
    expect(element.querySelector('dl')?.textContent).toContain(MESSAGES.result.walletStatusLabels.REJECTED);
  });

  it('Scenario: Revisión manual permite actualizar el estado', () => {
    const { fixture, http, element } = render();
    register(fixture, 'MANUAL_REVIEW');
    completeRegistration(fixture, http, 'PENDING');

    element.querySelector<HTMLButtonElement>('button.secondary')!.click();
    http.expectOne('/kyc/verifications/kyc-1').flush({ id: 'kyc-1', wallet_id: 'wal-1', scenario: 'MANUAL_REVIEW', status: 'ACTIVE' });
    http
      .expectOne('/wallets/wal-1')
      .flush({ id: 'wal-1', status: 'ACTIVE', balance: 0, reserved: 0, available: 0, currency: 'PEN' });
    fixture.detectChanges();

    expect(element.querySelector('h2')?.textContent).toBe(MESSAGES.result.ACTIVE.title);
  });

  it('Scenario: Proveedor no disponible conserva el formulario', () => {
    const { fixture, http, element } = render();

    register(fixture, 'UNAVAILABLE');
    http.expectOne('/kyc/verifications').flush({ error: 'KYC_UNAVAILABLE' }, { status: 503, statusText: 'Service Unavailable' });
    fixture.detectChanges();

    expect(element.querySelector('[role=alert]')?.textContent).toBe(MESSAGES.errors.KYC_UNAVAILABLE);
    expect(element.querySelector<HTMLInputElement>('#document')?.value).toBe('TEST-001');
    expect(element.querySelector<HTMLSelectElement>('#scenario')?.value).toBe('UNAVAILABLE');
    expect(element.querySelector<HTMLButtonElement>('button.primary')?.disabled).toBe(false);
  });

  it('Scenario: Falla la consulta tras el alta y se reintenta sin crear otra wallet', () => {
    const { fixture, http, element } = render();
    register(fixture, 'APPROVED');
    http
      .expectOne('/kyc/verifications')
      .flush({ id: 'kyc-1', wallet_id: 'wal-1', scenario: 'APPROVED', status: 'ACTIVE' }, { status: 201, statusText: 'Created' });
    http
      .expectOne('/kyc/verifications/kyc-1')
      .flush({ id: 'kyc-1', wallet_id: 'wal-1', scenario: 'APPROVED', status: 'ACTIVE' });
    http.expectOne('/wallets/wal-1').flush({ error: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(element.querySelector('[role=alert]')?.textContent).toBe(MESSAGES.errors.NOT_FOUND);

    element.querySelector<HTMLButtonElement>('button.retry')!.click();
    http.expectNone('/kyc/verifications');
    http.expectOne('/kyc/verifications/kyc-1').flush({ id: 'kyc-1', wallet_id: 'wal-1', scenario: 'APPROVED', status: 'ACTIVE' });
    http
      .expectOne('/wallets/wal-1')
      .flush({ id: 'wal-1', status: 'ACTIVE', balance: 0, reserved: 0, available: 0, currency: 'PEN' });
    fixture.detectChanges();

    expect(element.querySelector('h2')?.textContent).toBe(MESSAGES.result.ACTIVE.title);
  });
});

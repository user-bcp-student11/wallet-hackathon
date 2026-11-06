import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MESSAGES } from '../../../shared/i18n/messages.es-pe';
import { ActivationComponent } from './activation.component';

const ACCESS_URL = '/api/v1/wallet/payments-access';

function render() {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const fixture = TestBed.createComponent(ActivationComponent);
  fixture.detectChanges();
  return { fixture, http: TestBed.inject(HttpTestingController), element: fixture.nativeElement as HTMLElement };
}

describe('ActivationComponent', () => {
  it('Scenario: Onboarding completado', () => {
    const { fixture, http, element } = render();

    http.expectOne(ACCESS_URL).flush({ enabled: true });
    fixture.detectChanges();

    expect(element.querySelector('h2')?.textContent).toBe(MESSAGES.activation.title);
    const link = element.querySelector<HTMLAnchorElement>('a.primary')!;
    expect(link.textContent).toBe(MESSAGES.actions.goToPayments);
    expect(link.getAttribute('href')).toBe('/pagos');
  });

  it('Scenario: Wallet no activa', () => {
    const { fixture, http, element } = render();

    http
      .expectOne(ACCESS_URL)
      .flush({ detail: MESSAGES.activation.notActive }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(element.querySelector('[role=alert]')?.textContent).toBe(MESSAGES.activation.notActive);
    expect(element.querySelector('a.primary')).toBeNull();
    expect(element.querySelector<HTMLButtonElement>('button.primary')?.disabled).toBe(true);
  });

  it('Scenario: Estado en verificación', () => {
    const { element } = render();

    expect(element.querySelector('[role=status]')?.textContent).toBe(MESSAGES.activation.checking);
  });
});

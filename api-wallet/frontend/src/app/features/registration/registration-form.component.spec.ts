import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KycRequest } from '../../core/api/api.models';
import { MESSAGES } from '../../shared/i18n/messages.es-pe';
import { RegistrationFormComponent } from './registration-form.component';

function field<E extends HTMLElement>(fixture: ComponentFixture<unknown>, id: string): E {
  return (fixture.nativeElement as HTMLElement).querySelector<E>(`#${id}`)!;
}

function type(fixture: ComponentFixture<unknown>, id: string, value: string): void {
  const control = field<HTMLInputElement | HTMLSelectElement>(fixture, id);
  control.value = value;
  control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input'));
}

function submit(fixture: ComponentFixture<unknown>): void {
  (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'));
  fixture.detectChanges();
}

function createForm() {
  const fixture = TestBed.createComponent(RegistrationFormComponent);
  const submitted: KycRequest[] = [];
  fixture.componentInstance.submitted.subscribe((request) => submitted.push(request));
  fixture.detectChanges();
  return { fixture, submitted };
}

describe('RegistrationFormComponent', () => {
  it('Scenario: Escenario omitido usa APPROVED por defecto', () => {
    const { fixture, submitted } = createForm();
    type(fixture, 'document', ' TEST-001 ');

    submit(fixture);

    expect(submitted).toEqual([{ documentType: 'TEST', document: 'TEST-001', scenario: 'APPROVED' }]);
  });

  it('Scenario: Entrada inválida por documento vacío', async () => {
    const { fixture, submitted } = createForm();

    submit(fixture);
    await fixture.whenStable();

    expect(submitted).toEqual([]);
    expect(field(fixture, 'document-error').textContent).toContain(MESSAGES.validation.documentRequired);
    expect(field(fixture, 'document').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(field(fixture, 'document'));
  });

  it('Scenario: Entrada inválida por documento sin prefijo TEST-', async () => {
    const { fixture, submitted } = createForm();
    type(fixture, 'document', '12345678');

    submit(fixture);
    await fixture.whenStable();

    expect(submitted).toEqual([]);
    expect(field(fixture, 'document-error').textContent).toContain(MESSAGES.validation.documentPrefix);
  });

  it('Scenario: Entrada inválida por documento demasiado largo', async () => {
    const { fixture, submitted } = createForm();
    type(fixture, 'document', `TEST-${'1'.repeat(200)}`);

    submit(fixture);
    await fixture.whenStable();

    expect(submitted).toEqual([]);
    expect(field(fixture, 'document-error').textContent).toContain(MESSAGES.validation.documentLength);
  });

  it('Scenario: Se envía el escenario elegido', () => {
    const { fixture, submitted } = createForm();
    type(fixture, 'document', 'TEST-002');
    type(fixture, 'scenario', 'MANUAL_REVIEW');

    submit(fixture);

    expect(submitted).toEqual([{ documentType: 'TEST', document: 'TEST-002', scenario: 'MANUAL_REVIEW' }]);
  });

  it('Scenario: Envío en curso deshabilita el botón', () => {
    const { fixture } = createForm();
    fixture.componentRef.setInput('submitting', true);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!;
    expect(button.disabled).toBe(true);
    expect(button.textContent?.trim()).toBe(MESSAGES.actions.submitting);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FieldError, StepValues } from '../../../core/api/api.models';
import { MESSAGES } from '../../../shared/i18n/messages.es-pe';
import { ConfirmationStepFormComponent } from './confirmation-step-form.component';
import { IdentityStepFormComponent } from './identity-step-form.component';
import { PhoneStepFormComponent } from './phone-step-form.component';

type Fixture<T> = ComponentFixture<T>;

function setInput<T>(fixture: Fixture<T>, name: string, value: unknown): void {
  fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
}

function field<E extends HTMLElement>(fixture: Fixture<unknown>, id: string): E {
  return (fixture.nativeElement as HTMLElement).querySelector<E>(`#${id}`)!;
}

function type(fixture: Fixture<unknown>, id: string, value: string): void {
  const control = field<HTMLInputElement | HTMLSelectElement>(fixture, id);
  control.value = value;
  control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input'));
}

function submit(fixture: Fixture<unknown>): void {
  (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'));
  fixture.detectChanges();
}

function createIdentityForm() {
  const fixture = TestBed.createComponent(IdentityStepFormComponent);
  const submitted: StepValues[] = [];
  fixture.componentInstance.submitted.subscribe((values) => submitted.push(values));
  fixture.detectChanges();
  return { fixture, submitted };
}

function fillValidIdentity(fixture: Fixture<unknown>): void {
  type(fixture, 'documentNumber', '12345678');
  type(fixture, 'firstName', 'Ana');
  type(fixture, 'lastName', 'Quispe');
  type(fixture, 'birthDate', '1990-05-20');
}

describe('Formularios de paso', () => {
  it('Scenario: Campo obligatorio vacío', async () => {
    const { fixture, submitted } = createIdentityForm();
    fillValidIdentity(fixture);
    type(fixture, 'firstName', '');

    submit(fixture);
    await fixture.whenStable();

    expect(submitted).toEqual([]);
    expect(field(fixture, 'firstName-error').textContent).toContain(MESSAGES.validation.firstNameRequired);
    expect(field(fixture, 'firstName').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(field(fixture, 'firstName'));
  });

  it('Scenario: Varios campos inválidos', async () => {
    const { fixture, submitted } = createIdentityForm();
    fillValidIdentity(fixture);
    type(fixture, 'documentNumber', '1234567');
    type(fixture, 'birthDate', '2015-01-01');

    submit(fixture);
    await fixture.whenStable();

    expect(submitted).toEqual([]);
    expect(field(fixture, 'documentNumber-error').textContent).toContain(MESSAGES.validation.dniLength);
    expect(field(fixture, 'birthDate-error').textContent).toContain(MESSAGES.validation.underage);
    expect((field(fixture, 'firstName') as HTMLInputElement).value).toBe('Ana');
  });

  it('Scenario: Validación local suficiente envía los valores', () => {
    const { fixture, submitted } = createIdentityForm();
    fillValidIdentity(fixture);

    submit(fixture);

    expect(submitted).toEqual([
      {
        documentType: 'DNI',
        documentNumber: '12345678',
        firstName: 'Ana',
        lastName: 'Quispe',
        birthDate: '1990-05-20',
      },
    ]);
  });

  it('Scenario: Errores del servidor se asignan a cada control conservando lo ingresado', async () => {
    const { fixture } = createIdentityForm();
    fillValidIdentity(fixture);
    const errors: FieldError[] = [
      { field: 'documentNumber', message: 'No pudimos validar tu documento.' },
      { field: 'lastName', message: 'Ingresa tus apellidos.' },
    ];

    setInput(fixture, 'serverErrors', errors);
    await fixture.whenStable();

    expect(field(fixture, 'documentNumber-error').textContent).toContain('No pudimos validar tu documento.');
    expect(field(fixture, 'lastName-error').textContent).toContain('Ingresa tus apellidos.');
    expect((field(fixture, 'documentNumber') as HTMLInputElement).value).toBe('12345678');
    expect((field(fixture, 'firstName') as HTMLInputElement).value).toBe('Ana');
    expect(document.activeElement).toBe(field(fixture, 'documentNumber'));
  });

  it('Scenario: Número CE se valida con su formato', () => {
    const { fixture, submitted } = createIdentityForm();
    fillValidIdentity(fixture);
    type(fixture, 'documentType', 'CE');
    type(fixture, 'documentNumber', '123456789');

    submit(fixture);

    expect(submitted[0]['documentType']).toBe('CE');
  });

  it('Scenario: Celular con formato inválido', async () => {
    const fixture = TestBed.createComponent(PhoneStepFormComponent);
    fixture.detectChanges();
    type(fixture, 'phoneNumber', '812345678');
    type(fixture, 'otpCode', '123456');

    submit(fixture);
    await fixture.whenStable();

    expect(field(fixture, 'phoneNumber-error').textContent).toContain(MESSAGES.validation.phonePrefix);
  });

  it('Scenario: Solicitar código solo con celular válido', () => {
    const fixture = TestBed.createComponent(PhoneStepFormComponent);
    const requested: string[] = [];
    fixture.componentInstance.codeRequested.subscribe((phone) => requested.push(phone));
    fixture.detectChanges();

    type(fixture, 'phoneNumber', '812345678');
    field<HTMLButtonElement>(fixture, 'phoneNumber').closest('.field')!.querySelector('button')!.click();
    expect(requested).toEqual([]);

    type(fixture, 'phoneNumber', '912345678');
    field<HTMLButtonElement>(fixture, 'phoneNumber').closest('.field')!.querySelector('button')!.click();
    expect(requested).toEqual(['912345678']);
  });

  it('Scenario: Términos sin aceptar', async () => {
    const fixture = TestBed.createComponent(ConfirmationStepFormComponent);
    fixture.detectChanges();

    submit(fixture);
    await fixture.whenStable();

    expect(field(fixture, 'acceptedTerms-error').textContent).toContain(MESSAGES.validation.termsRequired);
  });

  it('Scenario: Último paso', () => {
    const fixture = TestBed.createComponent(ConfirmationStepFormComponent);
    setInput(fixture, 'isLastStep', true);

    expect(fixture.nativeElement.querySelector('button[type=submit]').textContent).toContain('Finalizar registro');
  });

  it('Scenario: Paso intermedio usa la acción continuar', () => {
    const { fixture } = createIdentityForm();

    expect(fixture.nativeElement.querySelector('button[type=submit]').textContent).toContain('Continuar');
  });
});

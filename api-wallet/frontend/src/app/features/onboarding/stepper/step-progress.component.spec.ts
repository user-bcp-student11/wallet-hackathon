import { TestBed } from '@angular/core/testing';
import { Onboarding } from '../../../core/api/api.models';
import { StepProgressComponent } from './step-progress.component';

function onboarding(overrides: Partial<Onboarding>): Onboarding {
  return {
    id: 'a1',
    status: 'IN_PROGRESS',
    stepNumber: 1,
    totalSteps: 3,
    currentStep: 'phone',
    instruction: 'Ingresa tu celular',
    nextStepLabel: 'Tus datos personales',
    walletActive: false,
    steps: [
      { code: 'phone', title: 'Verifica tu celular', status: 'CURRENT' },
      { code: 'identity', title: 'Tus datos personales', status: 'PENDING' },
      { code: 'confirmation', title: 'Activa tu wallet', status: 'PENDING' },
    ],
    ...overrides,
  };
}

function render(value: Onboarding): HTMLElement {
  const fixture = TestBed.createComponent(StepProgressComponent);
  fixture.componentRef.setInput('onboarding', value);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('StepProgressComponent', () => {
  it('Scenario: Paso intermedio', () => {
    const element = render(
      onboarding({
        stepNumber: 2,
        currentStep: 'identity',
        nextStepLabel: 'Activa tu wallet',
        steps: [
          { code: 'phone', title: 'Verifica tu celular', status: 'COMPLETED' },
          { code: 'identity', title: 'Tus datos personales', status: 'CURRENT' },
          { code: 'confirmation', title: 'Activa tu wallet', status: 'PENDING' },
        ],
      }),
    );

    expect(element.querySelector('.counter')?.textContent).toContain('Paso 2 de 3');
    const items = Array.from(element.querySelectorAll('li'));
    expect(items[0].textContent).toContain('Completado');
    expect(items[1].getAttribute('aria-current')).toBe('step');
    expect(items[2].textContent).toContain('Pendiente');
    expect(element.querySelector('.instruction')?.textContent).toContain('Ingresa tu celular');
    expect(element.querySelector('.next')?.textContent).toContain('Siguiente: Activa tu wallet');
  });

  it('Scenario: Último paso', () => {
    const element = render(
      onboarding({
        stepNumber: 3,
        currentStep: 'confirmation',
        nextStepLabel: undefined,
        steps: [
          { code: 'phone', title: 'Verifica tu celular', status: 'COMPLETED' },
          { code: 'identity', title: 'Tus datos personales', status: 'COMPLETED' },
          { code: 'confirmation', title: 'Activa tu wallet', status: 'CURRENT' },
        ],
      }),
    );

    expect(element.querySelector('.counter')?.textContent).toContain('Paso 3 de 3');
    expect(element.querySelector('.next')).toBeNull();
  });

  it('Scenario: Cambio de configuración', () => {
    const element = render(
      onboarding({
        totalSteps: 2,
        currentStep: 'identity',
        steps: [
          { code: 'identity', title: 'Tus datos personales', status: 'CURRENT' },
          { code: 'confirmation', title: 'Activa tu wallet', status: 'PENDING' },
        ],
      }),
    );

    expect(element.querySelector('.counter')?.textContent).toContain('Paso 1 de 2');
    expect(element.querySelectorAll('li').length).toBe(2);
  });
});

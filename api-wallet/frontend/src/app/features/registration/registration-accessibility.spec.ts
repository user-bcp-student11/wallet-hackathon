import { TestBed } from '@angular/core/testing';
import { MESSAGES } from '../../shared/i18n/messages.es-pe';
import { RegistrationFormComponent } from './registration-form.component';

const MIN_TOUCH_TARGET_PX = 44;

function submit(element: HTMLElement): void {
  element.querySelector('form')!.dispatchEvent(new Event('submit'));
}

function render() {
  const fixture = TestBed.createComponent(RegistrationFormComponent);
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

describe('Accesibilidad del formulario de registro', () => {
  it('Scenario: Cada campo tiene una etiqueta asociada', () => {
    const { element } = render();

    const controls = Array.from(element.querySelectorAll('input, select'));

    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      expect(element.querySelector(`label[for="${control.id}"]`), control.id).not.toBeNull();
    }
  });

  it('Scenario: aria-describedby enlaza el campo con su pista y su mensaje de error', async () => {
    const { fixture, element } = render();
    const document = element.querySelector<HTMLInputElement>('#document')!;
    expect(document.getAttribute('aria-describedby')).toBe('document-hint');

    submit(element);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.getAttribute('aria-describedby')).toBe('document-hint document-error');
    expect(element.querySelector('#document-error')?.textContent).toContain(MESSAGES.validation.documentRequired);
  });

  it('Scenario: El foco va al primer campo con error', async () => {
    const { fixture, element } = render();

    submit(element);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(globalThis.document.activeElement?.id).toBe('document');
  });

  it('Scenario: Los objetivos táctiles miden al menos 44 px', () => {
    const { element } = render();

    const targets = Array.from(element.querySelectorAll<HTMLElement>('button, input, select'));

    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      const minHeight = parseFloat(getComputedStyle(target).minHeight);
      expect(minHeight, target.id || target.textContent).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
    }
  });

  it('Scenario: Los textos visibles provienen del catálogo es-PE', () => {
    const { element } = render();

    expect(element.querySelector('label[for=documentType]')?.textContent).toBe(MESSAGES.fields.documentType);
    expect(element.querySelector('label[for=document]')?.textContent).toBe(MESSAGES.fields.document);
    expect(element.querySelector('label[for=scenario]')?.textContent).toBe(MESSAGES.fields.scenario);
    expect(element.querySelector('#document-hint')?.textContent).toBe(MESSAGES.hints.document);
    expect(element.querySelector('button.primary')?.textContent?.trim()).toBe(MESSAGES.actions.register);
    const options = Array.from(element.querySelectorAll('#scenario option')).map((option) => option.textContent);
    expect(options).toEqual([
      MESSAGES.scenarios.APPROVED,
      MESSAGES.scenarios.MANUAL_REVIEW,
      MESSAGES.scenarios.REJECTED,
      MESSAGES.scenarios.UNAVAILABLE,
    ]);
  });
});

import { TestBed } from '@angular/core/testing';
import { MESSAGES } from '../../../shared/i18n/messages.es-pe';
import { IdentityStepFormComponent } from './identity-step-form.component';
import { PhoneStepFormComponent } from './phone-step-form.component';

const MIN_TOUCH_TARGET_PX = 44;

function submit(element: HTMLElement): void {
  element.querySelector('form')!.dispatchEvent(new Event('submit'));
}

describe('Accesibilidad de los formularios', () => {
  it('Scenario: Cada campo tiene una etiqueta asociada', () => {
    const fixture = TestBed.createComponent(IdentityStepFormComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const controls = Array.from(element.querySelectorAll('input, select'));

    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      expect(element.querySelector(`label[for="${control.id}"]`), control.id).not.toBeNull();
    }
  });

  it('Scenario: aria-describedby enlaza el campo con su mensaje de error', async () => {
    const fixture = TestBed.createComponent(PhoneStepFormComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const phone = element.querySelector<HTMLInputElement>('#phoneNumber')!;
    expect(phone.getAttribute('aria-describedby')).toBe('phoneNumber-hint');

    submit(element);
    await fixture.whenStable();

    expect(phone.getAttribute('aria-describedby')).toBe('phoneNumber-hint phoneNumber-error');
    expect(element.querySelector('#phoneNumber-error')?.textContent).toContain(MESSAGES.validation.phoneRequired);
  });

  it('Scenario: El foco va al primer campo con error', async () => {
    const fixture = TestBed.createComponent(PhoneStepFormComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    submit(element);
    await fixture.whenStable();

    expect(document.activeElement?.id).toBe('phoneNumber');
  });

  it('Scenario: Los objetivos táctiles miden al menos 44 px', () => {
    const fixture = TestBed.createComponent(PhoneStepFormComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const targets = Array.from(element.querySelectorAll<HTMLElement>('button, input:not([type=checkbox]), select'));

    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      const minHeight = parseFloat(getComputedStyle(target).minHeight);
      expect(minHeight, target.id || target.textContent).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
    }
  });

  it('Scenario: Los textos visibles provienen del catálogo es-PE', () => {
    const fixture = TestBed.createComponent(PhoneStepFormComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('label[for=phoneNumber]')?.textContent).toBe(MESSAGES.fields.phoneNumber);
    expect(element.querySelector('label[for=otpCode]')?.textContent).toBe(MESSAGES.fields.otpCode);
    expect(element.querySelector('button.secondary')?.textContent).toBe(MESSAGES.actions.sendCode);
  });
});

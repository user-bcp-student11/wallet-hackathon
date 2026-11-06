import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home';

describe('Home (landing)', () => {
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(Home);
    root = fixture.nativeElement;
    await fixture.whenStable();
  });

  const text = () => root.textContent ?? '';

  it('muestra el mensaje de marca del concepto', () => {
    expect(root.querySelector('.eyebrow')?.textContent).toContain('TU DINERO, A TU MANERA');

    const title = root.querySelector('h1')!;
    expect(title.textContent).toContain('Tu día a día,');
    expect(title.textContent).toContain('más simple.');
    expect(title.querySelector('span')?.textContent).toBe('simple.');

    expect(root.querySelector('.description')?.textContent).toContain(
      'Una nueva forma de mover tu dinero. Rápida, sencilla y pensada para ti.',
    );
  });

  it('muestra la tarjeta informativa con el contenido de marca', () => {
    const card = root.querySelector('.card-preview')!;

    expect(card.querySelector('.card-brand')?.textContent).toContain('Al toque');
    expect(card.querySelector('.card-eyebrow')?.textContent).toBe('TU DINERO, MÁS CERCA');
    expect(card.querySelector('.card-title')?.textContent).toBe('Paga y transfiere.');
    expect(card.querySelector('.card-desc')?.textContent).toBe('Todo desde un solo lugar.');

    const chips = Array.from(card.querySelectorAll('.chip')).map((chip) =>
      chip.textContent?.trim(),
    );
    expect(chips).toEqual(['Pagos con QR', 'Transferencias']);
  });

  it('la tarjeta se expone a lectores de pantalla (es información, no decoración)', () => {
    const card = root.querySelector('.card-preview')!;

    expect(card.getAttribute('aria-hidden')).toBeNull();
    expect(card.querySelectorAll('ul.chips > li')).toHaveLength(2);
  });

  it('la tarjeta y sus etiquetas no son controles; solo tiene un enlace a la activación', () => {
    const card = root.querySelector('.card-preview')!;
    const links = card.querySelectorAll<HTMLAnchorElement>('a');

    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain('Activa tu wallet');
    expect(links[0].getAttribute('href')).toBe('/activacion');
    expect(card.querySelector('button, input, select, textarea')).toBeNull();

    // La tarjeta y las etiquetas no se comportan como botones ni enlaces.
    for (const element of [card, ...Array.from(card.querySelectorAll('.chips, .chip, .chip *'))]) {
      expect(element.closest('a, button')).toBeNull();
      expect(element.hasAttribute('tabindex')).toBe(false);
      expect(element.hasAttribute('role')).toBe(false);
      expect(element.hasAttribute('onclick')).toBe(false);
    }
  });

  it('ofrece dos accesos en el panel: Regístrate y, para quien ya tiene cuenta, activar la wallet', () => {
    const buttons = Array.from(root.querySelectorAll<HTMLAnchorElement>('.panel a.button'));

    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'Regístrate',
      'Ya tengo cuenta: activar mi wallet',
    ]);
    expect(buttons.map((button) => button.getAttribute('href'))).toEqual([
      '/activacion',
      '/activacion',
    ]);
  });

  it('no inventa un inicio de sesión: los tres accesos de la landing llevan a la activación', () => {
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a'));

    expect(links).toHaveLength(3);
    expect(links.every((link) => link.getAttribute('href') === '/activacion')).toBe(true);
  });

  it('muestra el panel de bienvenida con el texto del concepto', () => {
    expect(root.querySelector('.kicker')?.textContent).toContain('BIENVENIDO A AL TOQUE');
    expect(root.querySelector('h2')?.textContent).toContain('Empieza a tu manera');
    expect(text()).toContain(
      'Tu wallet para acompañarte en cada momento. Comienza creando tu cuenta.',
    );
    expect(text()).toContain('¿Aún no tienes una cuenta?');
    expect(text()).toContain('Regístrate y da el primer paso para activar tu wallet.');
  });

  it('ofrece «Regístrate» como enlace a la pantalla de activación', () => {
    const link = root.querySelector<HTMLAnchorElement>('a.button')!;

    expect(link.textContent).toContain('Regístrate');
    expect(link.getAttribute('href')).toBe('/activacion');
  });

  it('indica que la verificación es simulada y que se usen solo datos ficticios', () => {
    const note = root.querySelector('.note')?.textContent ?? '';

    expect(note).toContain('Demostración con verificación simulada.');
    expect(note).toContain('Usa únicamente datos ficticios.');
  });

  it('no inventa un inicio de sesión ni formularios', () => {
    expect(text()).not.toMatch(/iniciar sesión|ingresar|contraseña/i);
    expect(root.querySelector('input, select, form')).toBeNull();
  });
});

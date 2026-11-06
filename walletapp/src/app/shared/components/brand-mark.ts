import { Component } from '@angular/core';

/** Marca «Al toque»: destello. Decorativa, oculta a lectores de pantalla. */
@Component({
  selector: 'app-brand-mark',
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="currentColor" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      width: 1.8rem;
      height: 1.8rem;
      border-radius: 0.56rem;
      color: #fff;
      background: var(--color-primary);
    }

    :host(.plain) {
      width: auto;
      height: auto;
      background: none;
    }

    /* Icono de la tarjeta de bienvenida. */
    :host(.tile) {
      width: 3rem;
      height: 3rem;
      border: 1px solid #263d6e;
      border-radius: 0.9375rem;
      color: #8eb1ff;
      background: #19294c;
    }

    svg {
      width: 1.1rem;
      height: 1.1rem;
    }

    :host(.tile) svg {
      width: 1.4rem;
      height: 1.4rem;
    }
  `,
})
export class BrandMark {}

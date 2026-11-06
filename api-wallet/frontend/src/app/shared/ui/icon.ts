import { Component, input } from '@angular/core';

export type IconName = 'sparkle' | 'arrow-right' | 'arrow-left' | 'qr' | 'transfer' | 'info' | 'check' | 'clock' | 'alert';

/** Ícono SVG decorativo (aria-hidden). El texto accesible lo aporta el control que lo contiene. */
@Component({
  selector: 'app-icon',
  host: { 'aria-hidden': 'true', class: 'icon' },
  template: `
    <svg viewBox="0 0 24 24" [attr.width]="size()" [attr.height]="size()" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">
      @switch (name()) {
        @case ('sparkle') {
          <path d="M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7Z" fill="currentColor" stroke="none" />
        }
        @case ('arrow-right') {
          <path d="M5 12h14M13 6l6 6-6 6" />
        }
        @case ('arrow-left') {
          <path d="M19 12H5M11 6l-6 6 6 6" />
        }
        @case ('qr') {
          <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" />
        }
        @case ('transfer') {
          <path d="M4 8h14l-3-3M20 16H6l3 3" />
        }
        @case ('info') {
          <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
        }
        @case ('check') {
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
        }
        @case ('alert') {
          <circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5h.01" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
}

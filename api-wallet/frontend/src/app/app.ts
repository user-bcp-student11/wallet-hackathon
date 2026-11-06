import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MESSAGES } from './core/i18n/messages.es-pe';
import { Icon } from './shared/ui/icon';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, Icon],
  template: `
    <a class="skip-link" href="#main">{{ t.skipToContent }}</a>
    <header class="app-header">
      <a class="brand" routerLink="/" [attr.aria-label]="t.homeLink">
        <span class="brand__mark"><app-icon name="sparkle" [size]="18" /></span>
        <span class="brand__name">{{ t.brand }}</span>
      </a>
      <span class="app-header__tagline">{{ t.tagline }}</span>
    </header>
    <main id="main" class="app-main" tabindex="-1">
      <router-outlet />
    </main>
    <footer class="app-footer">
      <span>{{ t.footerCopy }} · {{ t.footerConcept }}</span>
      <span>{{ t.footerMotto }}</span>
    </footer>
  `,
})
export class App {
  protected readonly t = MESSAGES.app;
}

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MESSAGES } from './core/i18n/messages.es-pe';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <a class="skip-link" href="#main">{{ t.skipToContent }}</a>
    <header class="app-header">
      <span class="app-header__brand">{{ t.brand }}</span>
    </header>
    <main id="main" class="app-main" tabindex="-1">
      <router-outlet />
    </main>
  `,
})
export class App {
  protected readonly t = MESSAGES.app;
}

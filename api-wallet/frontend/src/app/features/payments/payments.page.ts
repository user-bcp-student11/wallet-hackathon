import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MESSAGES } from '../../shared/i18n/messages.es-pe';

@Component({
  selector: 'app-payments-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <h1>{{ messages.payments.title }}</h1>
      <p>{{ messages.payments.description }}</p>
    </main>
  `,
  styles: `
    main {
      max-width: 480px;
      margin: 0 auto;
      padding: 1rem;
    }
  `,
})
export class PaymentsPage {
  protected readonly messages = MESSAGES;
}

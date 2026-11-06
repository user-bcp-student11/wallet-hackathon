import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MESSAGES } from '../../core/i18n/messages.es-pe';
import { PenCentsPipe } from '../../shared/format/pen-cents.pipe';
import { Icon } from '../../shared/ui/icon';
import { OnboardingStore } from '../onboarding/onboarding.store';

/**
 * Punto de entrada de pagos de bajo monto. Los pagos (W2, change `payment-core`) aún no están en el
 * contrato implementado, así que las acciones se muestran como "Próximamente".
 */
@Component({
  selector: 'app-payments-page',
  imports: [RouterLink, Icon, PenCentsPipe],
  template: `
    <div class="payments">
      <a class="back-link" routerLink="/registro"><app-icon name="arrow-left" [size]="18" />{{ t.back }}</a>
      <section class="card" aria-labelledby="payments-title">
        <p class="eyebrow">{{ t.eyebrow }}</p>
        <h1 id="payments-title">{{ t.title }}</h1>
        <p class="muted">{{ t.intro }}</p>

        @if (store.wallet(); as wallet) {
          <div class="balance">
            <span class="balance__label">{{ t.available }}</span>
            <span class="balance__amount" data-testid="payments-available">{{ wallet.available | penCents }}</span>
          </div>
        }

        <ul class="options">
          <li>
            <button type="button" class="option" disabled aria-describedby="payments-soon">
              <span class="option__icon"><app-icon name="qr" /></span>
              <span class="option__name">{{ t.qr }}</span>
              <span class="option__tag">{{ t.soon }}</span>
            </button>
          </li>
          <li>
            <button type="button" class="option" disabled aria-describedby="payments-soon">
              <span class="option__icon"><app-icon name="transfer" /></span>
              <span class="option__name">{{ t.transfer }}</span>
              <span class="option__tag">{{ t.soon }}</span>
            </button>
          </li>
        </ul>
        <p class="notice" id="payments-soon"><app-icon name="info" [size]="16" />{{ t.soonHint }}</p>
      </section>
    </div>
  `,
  styles: `
    .payments {
      max-width: 28rem;
      margin: 0 auto;
    }
    h1 {
      margin: 0 0 0.5rem;
      font-size: 1.75rem;
      font-weight: 800;
    }
    .balance {
      display: flex;
      flex-direction: column;
      margin: 1.25rem 0;
      padding: 1rem;
      border: 1px solid #2d3a5c;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, #18213a, #121a2e);
    }
    .balance__label {
      color: var(--color-muted);
      font-size: 0.8125rem;
    }
    .balance__amount {
      font-size: 1.75rem;
      font-weight: 800;
    }
    .options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .option {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
      width: 100%;
      min-height: 7rem;
      padding: 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface-2);
      color: var(--color-text);
      font: inherit;
      text-align: left;
      cursor: not-allowed;
    }
    .option__icon {
      color: var(--color-accent);
    }
    .option__name {
      font-weight: 700;
    }
    .option__tag {
      padding: 0.125rem 0.5rem;
      border: 1px solid var(--color-border-strong);
      border-radius: 999px;
      color: var(--color-muted);
      font-size: 0.75rem;
    }
  `,
})
export class PaymentsPage {
  protected readonly store = inject(OnboardingStore);
  protected readonly t = MESSAGES.payments;
}

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MESSAGES } from '../../shared/i18n/messages.es-pe';
import { RegistrationResult } from './registration.store';

const PEN = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

@Component({
  selector: 'app-registration-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './registration-result.component.css',
  template: `
    <section [attr.data-status]="status()">
      <h2 tabindex="-1">{{ content().title }}</h2>
      <p>{{ content().description }}</p>

      <dl>
        <dt>{{ messages.result.walletStatus }}</dt>
        <dd>{{ messages.result.walletStatusLabels[result().wallet.status] }}</dd>
        @if (status() === 'ACTIVE') {
          <dt>{{ messages.result.available }}</dt>
          <dd>{{ available() }}</dd>
        }
      </dl>

      @if (status() === 'PENDING') {
        <button type="button" class="secondary" (click)="refresh.emit()">{{ messages.actions.refresh }}</button>
      }
      <button type="button" class="primary" (click)="startOver.emit()">{{ messages.actions.startOver }}</button>
    </section>
  `,
})
export class RegistrationResultComponent {
  readonly result = input.required<RegistrationResult>();
  readonly refresh = output<void>();
  readonly startOver = output<void>();

  protected readonly messages = MESSAGES;
  protected readonly status = computed(() => this.result().verification.status);
  protected readonly content = computed(() => MESSAGES.result[this.status()]);
  protected readonly available = computed(() => PEN.format(this.result().wallet.available / 100));
}

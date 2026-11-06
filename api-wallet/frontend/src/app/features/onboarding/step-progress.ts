import { Component, computed, input } from '@angular/core';
import { MESSAGES } from '../../core/i18n/messages.es-pe';
import { Icon } from '../../shared/ui/icon';

/** Indicador "Paso X de N" y lista de pasos (completados / actual / pendientes), siempre visible. */
@Component({
  selector: 'app-step-progress',
  imports: [Icon],
  template: `
    <nav class="steps" [attr.aria-label]="t.label">
      <p class="steps__count" data-testid="step-count">
        {{ t.progress(current(), names.length) }} · <strong>{{ names[current() - 1] }}</strong>
      </p>
      <ol class="steps__list">
        @for (name of names; track name; let i = $index) {
          @let n = i + 1;
          <li
            class="step"
            [class.step--done]="n < current()"
            [class.step--current]="n === current()"
            [attr.aria-current]="n === current() ? 'step' : null"
          >
            <span class="step__badge">
              @if (n < current()) {
                <app-icon name="check" [size]="14" />
              } @else {
                {{ n }}
              }
            </span>
            <span class="step__name">
              {{ name }}
              <span class="visually-hidden">
                ({{ n < current() ? t.completed : n === current() ? t.current : '' }})
              </span>
            </span>
          </li>
        }
      </ol>
      <p class="steps__next" data-testid="step-next">{{ next() }}</p>
    </nav>
  `,
  styleUrl: './step-progress.css',
})
export class StepProgress {
  /** Paso actual, empezando en 1. */
  readonly current = input.required<number>();

  protected readonly t = MESSAGES.steps;
  protected readonly names = MESSAGES.steps.names;

  protected readonly next = computed(() => {
    const following = this.names[this.current()];
    return following ? this.t.nextLabel(following) : this.t.lastStep;
  });
}

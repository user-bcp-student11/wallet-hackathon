import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Onboarding } from '../../../core/api/api.models';
import { MESSAGES } from '../../../shared/i18n/messages.es-pe';

@Component({
  selector: 'app-step-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './step-progress.component.css',
  template: `
    <section aria-labelledby="step-counter">
      <p id="step-counter" class="counter">
        {{ messages.stepper.stepOf(onboarding().stepNumber, onboarding().totalSteps) }}
      </p>
      <ol class="steps" [attr.aria-label]="messages.stepper.listLabel">
        @for (step of onboarding().steps; track step.code) {
          <li [class]="step.status.toLowerCase()" [attr.aria-current]="step.status === 'CURRENT' ? 'step' : null">
            <span class="title">{{ step.title }}</span>
            <span class="status">{{ messages.stepper.status[step.status] }}</span>
          </li>
        }
      </ol>
      @if (onboarding().instruction) {
        <p class="instruction">{{ onboarding().instruction }}</p>
      }
      @if (nextStepText(); as next) {
        <p class="next">{{ next }}</p>
      }
    </section>
  `,
})
export class StepProgressComponent {
  readonly onboarding = input.required<Onboarding>();
  protected readonly messages = MESSAGES;

  protected readonly nextStepText = computed(() => {
    const label = this.onboarding().nextStepLabel;
    return label ? MESSAGES.stepper.nextStep(label) : null;
  });
}

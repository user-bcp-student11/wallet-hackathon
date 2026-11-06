import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmationStepFormComponent } from './forms/confirmation-step-form.component';
import { IdentityStepFormComponent } from './forms/identity-step-form.component';
import { PhoneStepFormComponent } from './forms/phone-step-form.component';
import { ActivationComponent } from './activation/activation.component';
import { StepProgressComponent } from './stepper/step-progress.component';
import { OnboardingStore } from './onboarding.store';
import { MESSAGES } from '../../shared/i18n/messages.es-pe';

@Component({
  selector: 'app-onboarding-page',
  imports: [
    ActivationComponent,
    ConfirmationStepFormComponent,
    IdentityStepFormComponent,
    PhoneStepFormComponent,
    StepProgressComponent,
  ],
  providers: [OnboardingStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './onboarding.page.css',
  template: `
    <main>
      <h1>{{ messages.app.title }}</h1>

      @if (store.loading()) {
        <p role="status">{{ messages.app.loading }}</p>
      }

      @if (store.message(); as message) {
        <p class="alert" role="alert">{{ message }}</p>
      }

      @if (store.onboarding(); as onboarding) {
        @if (onboarding.status === 'COMPLETED') {
          <app-activation />
        } @else {
          <app-step-progress [onboarding]="onboarding" />
          @switch (onboarding.currentStep) {
            @case ('phone') {
              <app-phone-step-form
                [serverErrors]="store.fieldErrors()"
                [submitting]="store.submitting()"
                [isLastStep]="onboarding.stepNumber === onboarding.totalSteps"
                [codeSent]="store.codeSent()"
                (codeRequested)="store.requestOtp($event)"
                (submitted)="store.submit($event)"
              />
            }
            @case ('identity') {
              <app-identity-step-form
                [serverErrors]="store.fieldErrors()"
                [submitting]="store.submitting()"
                [isLastStep]="onboarding.stepNumber === onboarding.totalSteps"
                (submitted)="store.submit($event)"
              />
            }
            @case ('confirmation') {
              <app-confirmation-step-form
                [serverErrors]="store.fieldErrors()"
                [submitting]="store.submitting()"
                [isLastStep]="onboarding.stepNumber === onboarding.totalSteps"
                (submitted)="store.submit($event)"
              />
            }
          }
        }
      } @else if (!store.loading() && store.message()) {
        <button type="button" class="retry" (click)="store.start()">{{ messages.app.retry }}</button>
      }
    </main>
  `,
})
export class OnboardingPage {
  protected readonly store = inject(OnboardingStore);
  protected readonly messages = MESSAGES;

  constructor() {
    this.store.start();
  }
}

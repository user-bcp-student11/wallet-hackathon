import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MESSAGES } from '../../shared/i18n/messages.es-pe';
import { RegistrationFormComponent } from './registration-form.component';
import { RegistrationResultComponent } from './registration-result.component';
import { RegistrationStore } from './registration.store';

@Component({
  selector: 'app-registration-page',
  imports: [RegistrationFormComponent, RegistrationResultComponent],
  providers: [RegistrationStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './registration.page.css',
  template: `
    <main>
      <h1>{{ messages.app.title }}</h1>

      @if (store.loadingResult()) {
        <p role="status">{{ messages.app.loading }}</p>
      }

      @if (store.message(); as message) {
        <p class="alert" role="alert">{{ message }}</p>
      }

      @if (store.result(); as result) {
        <app-registration-result
          [result]="result"
          (refresh)="store.loadResult()"
          (startOver)="store.reset()"
        />
      } @else if (store.created()) {
        @if (!store.loadingResult()) {
          <button type="button" class="retry" (click)="store.loadResult()">{{ messages.app.retry }}</button>
        }
      } @else {
        <app-registration-form [submitting]="store.submitting()" (submitted)="store.submit($event)" />
      }
    </main>
  `,
})
export class RegistrationPage {
  protected readonly store = inject(RegistrationStore);
  protected readonly messages = MESSAGES;
}

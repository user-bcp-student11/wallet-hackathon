import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { KycRequest, KycScenario } from '../../core/api/api.models';
import { FieldErrorComponent } from '../../shared/forms/field-error.component';
import { fieldErrorMessage, focusFirstError } from '../../shared/forms/form-errors';
import { requiredChoice, testDocumentValidator } from '../../shared/forms/kyc.validators';
import { MESSAGES } from '../../shared/i18n/messages.es-pe';

const SCENARIOS: KycScenario[] = ['APPROVED', 'MANUAL_REVIEW', 'REJECTED', 'UNAVAILABLE'];

@Component({
  selector: 'app-registration-form',
  imports: [ReactiveFormsModule, FieldErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './registration-form.component.css',
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
      <div class="field">
        <label for="documentType">{{ messages.fields.documentType }}</label>
        <select
          id="documentType"
          formControlName="documentType"
          [attr.aria-invalid]="invalidAttr('documentType')"
          [attr.aria-describedby]="describedBy('documentType')"
        >
          <option value="TEST">{{ messages.documentTypes.TEST }}</option>
        </select>
        <app-field-error errorId="documentType-error" [message]="error('documentType')" />
      </div>

      <div class="field">
        <label for="document">{{ messages.fields.document }}</label>
        <input
          id="document"
          type="text"
          autocomplete="off"
          formControlName="document"
          [attr.aria-invalid]="invalidAttr('document')"
          [attr.aria-describedby]="describedBy('document', true)"
        />
        <p class="hint" id="document-hint">{{ messages.hints.document }}</p>
        <app-field-error errorId="document-error" [message]="error('document')" />
      </div>

      <div class="field">
        <label for="scenario">{{ messages.fields.scenario }}</label>
        <select
          id="scenario"
          formControlName="scenario"
          [attr.aria-invalid]="invalidAttr('scenario')"
          [attr.aria-describedby]="describedBy('scenario')"
        >
          @for (scenario of scenarios; track scenario) {
            <option [value]="scenario">{{ messages.scenarios[scenario] }}</option>
          }
        </select>
        <app-field-error errorId="scenario-error" [message]="error('scenario')" />
      </div>

      <button type="submit" class="primary" [disabled]="submitting()">
        {{ submitting() ? messages.actions.submitting : messages.actions.register }}
      </button>
    </form>
  `,
})
export class RegistrationFormComponent {
  readonly submitting = input(false);
  readonly submitted = output<KycRequest>();

  protected readonly messages = MESSAGES;
  protected readonly scenarios = SCENARIOS;
  protected readonly form = new FormGroup({
    documentType: new FormControl<'TEST'>('TEST', {
      nonNullable: true,
      validators: [requiredChoice('documentTypeRequired')],
    }),
    document: new FormControl('', { nonNullable: true, validators: [testDocumentValidator] }),
    scenario: new FormControl<KycScenario>('APPROVED', {
      nonNullable: true,
      validators: [requiredChoice('scenarioRequired')],
    }),
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      afterNextRender(() => focusFirstError(this.host), { injector: this.injector });
      return;
    }
    const { documentType, document, scenario } = this.form.getRawValue();
    this.submitted.emit({ documentType, document: document.trim(), scenario });
  }

  protected error(field: string): string | null {
    return fieldErrorMessage(this.form.get(field));
  }

  protected invalidAttr(field: string): 'true' | null {
    return this.error(field) ? 'true' : null;
  }

  protected describedBy(field: string, hasHint = false): string | null {
    const ids = [hasHint ? `${field}-hint` : null, this.error(field) ? `${field}-error` : null].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  }
}

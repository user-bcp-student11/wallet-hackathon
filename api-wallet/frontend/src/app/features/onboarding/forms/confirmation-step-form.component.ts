import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FieldErrorComponent } from '../../../shared/forms/field-error.component';
import { mustBeTrue } from '../../../shared/forms/peru.validators';
import { StepFormBase } from './step-form.base';

@Component({
  selector: 'app-confirmation-step-form',
  imports: [ReactiveFormsModule, FieldErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './step-form.css',
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
      <div class="field">
        <div class="checkbox">
          <input
            id="acceptedTerms"
            type="checkbox"
            formControlName="acceptedTerms"
            [attr.aria-invalid]="invalidAttr('acceptedTerms')"
            [attr.aria-describedby]="describedBy('acceptedTerms')"
          />
          <label for="acceptedTerms">{{ messages.fields.acceptedTerms }}</label>
        </div>
        <app-field-error errorId="acceptedTerms-error" [message]="error('acceptedTerms')" />
      </div>

      <button type="submit" class="primary" [disabled]="submitting()">{{ primaryLabel() }}</button>
    </form>
  `,
})
export class ConfirmationStepFormComponent extends StepFormBase {
  protected override readonly form = new FormGroup({
    acceptedTerms: new FormControl(false, { nonNullable: true, validators: [mustBeTrue('termsRequired')] }),
  });
}

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FieldErrorComponent } from '../../../shared/forms/field-error.component';
import { phoneValidator, requiredText } from '../../../shared/forms/peru.validators';
import { StepFormBase } from './step-form.base';

@Component({
  selector: 'app-phone-step-form',
  imports: [ReactiveFormsModule, FieldErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './step-form.css',
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
      <div class="field">
        <label for="phoneNumber">{{ messages.fields.phoneNumber }}</label>
        <input
          id="phoneNumber"
          type="tel"
          inputmode="numeric"
          autocomplete="tel-national"
          maxlength="9"
          formControlName="phoneNumber"
          [attr.aria-invalid]="invalidAttr('phoneNumber')"
          [attr.aria-describedby]="describedBy('phoneNumber', true)"
        />
        <p id="phoneNumber-hint" class="hint">{{ messages.hints.phoneNumber }}</p>
        <app-field-error errorId="phoneNumber-error" [message]="error('phoneNumber')" />
        <div>
          <button type="button" class="secondary" (click)="requestCode()">{{ messages.actions.sendCode }}</button>
        </div>
        @if (codeSent()) {
          <p class="status" role="status">{{ messages.actions.codeSent }}</p>
        }
      </div>

      <div class="field">
        <label for="otpCode">{{ messages.fields.otpCode }}</label>
        <input
          id="otpCode"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          formControlName="otpCode"
          [attr.aria-invalid]="invalidAttr('otpCode')"
          [attr.aria-describedby]="describedBy('otpCode')"
        />
        <app-field-error errorId="otpCode-error" [message]="error('otpCode')" />
      </div>

      <button type="submit" class="primary" [disabled]="submitting()">{{ primaryLabel() }}</button>
    </form>
  `,
})
export class PhoneStepFormComponent extends StepFormBase {
  readonly codeSent = input(false);
  readonly codeRequested = output<string>();

  protected override readonly form = new FormGroup({
    phoneNumber: new FormControl('', { nonNullable: true, validators: [phoneValidator] }),
    otpCode: new FormControl('', { nonNullable: true, validators: [requiredText('otpRequired')] }),
  });

  protected requestCode(): void {
    const phone = this.form.controls.phoneNumber;
    phone.markAsTouched();
    if (phone.invalid) {
      return;
    }
    this.codeRequested.emit(phone.value.trim());
  }
}

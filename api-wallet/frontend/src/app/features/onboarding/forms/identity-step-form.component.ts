import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FieldErrorComponent } from '../../../shared/forms/field-error.component';
import { adultValidator, documentNumberValidator, requiredText } from '../../../shared/forms/peru.validators';
import { StepFormBase } from './step-form.base';

@Component({
  selector: 'app-identity-step-form',
  imports: [ReactiveFormsModule, FieldErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './step-form.css',
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
          <option value="DNI">{{ messages.documentTypes.DNI }}</option>
          <option value="CE">{{ messages.documentTypes.CE }}</option>
        </select>
        <app-field-error errorId="documentType-error" [message]="error('documentType')" />
      </div>

      <div class="field">
        <label for="documentNumber">{{ messages.fields.documentNumber }}</label>
        <input
          id="documentNumber"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          formControlName="documentNumber"
          [attr.aria-invalid]="invalidAttr('documentNumber')"
          [attr.aria-describedby]="describedBy('documentNumber')"
        />
        <app-field-error errorId="documentNumber-error" [message]="error('documentNumber')" />
      </div>

      <div class="field">
        <label for="firstName">{{ messages.fields.firstName }}</label>
        <input
          id="firstName"
          type="text"
          autocomplete="given-name"
          formControlName="firstName"
          [attr.aria-invalid]="invalidAttr('firstName')"
          [attr.aria-describedby]="describedBy('firstName')"
        />
        <app-field-error errorId="firstName-error" [message]="error('firstName')" />
      </div>

      <div class="field">
        <label for="lastName">{{ messages.fields.lastName }}</label>
        <input
          id="lastName"
          type="text"
          autocomplete="family-name"
          formControlName="lastName"
          [attr.aria-invalid]="invalidAttr('lastName')"
          [attr.aria-describedby]="describedBy('lastName')"
        />
        <app-field-error errorId="lastName-error" [message]="error('lastName')" />
      </div>

      <div class="field">
        <label for="birthDate">{{ messages.fields.birthDate }}</label>
        <input
          id="birthDate"
          type="date"
          autocomplete="bday"
          formControlName="birthDate"
          [attr.aria-invalid]="invalidAttr('birthDate')"
          [attr.aria-describedby]="describedBy('birthDate')"
        />
        <app-field-error errorId="birthDate-error" [message]="error('birthDate')" />
      </div>

      <button type="submit" class="primary" [disabled]="submitting()">{{ primaryLabel() }}</button>
    </form>
  `,
})
export class IdentityStepFormComponent extends StepFormBase {
  protected override readonly form = new FormGroup({
    documentType: new FormControl('DNI', { nonNullable: true, validators: [requiredText('documentTypeRequired')] }),
    documentNumber: new FormControl('', {
      nonNullable: true,
      validators: [documentNumberValidator],
    }),
    firstName: new FormControl('', { nonNullable: true, validators: [requiredText('firstNameRequired')] }),
    lastName: new FormControl('', { nonNullable: true, validators: [requiredText('lastNameRequired')] }),
    birthDate: new FormControl('', { nonNullable: true, validators: [adultValidator(() => new Date())] }),
  });

  constructor() {
    super();
    this.form.controls.documentType.valueChanges.subscribe(() =>
      this.form.controls.documentNumber.updateValueAndValidity(),
    );
  }
}

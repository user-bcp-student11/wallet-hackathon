import { Component, input } from '@angular/core';

/** Mensaje de error de un campo, referenciado por `aria-describedby` desde el control. */
@Component({
  selector: 'app-field-error',
  template: `<p class="field-error" [id]="errorId()">{{ message() }}</p>`,
  styles: `
    .field-error {
      margin: 0.25rem 0 0;
      color: var(--color-danger);
      font-size: 0.9375rem;
    }
  `,
})
export class FieldError {
  readonly errorId = input.required<string>();
  readonly message = input.required<string>();
}

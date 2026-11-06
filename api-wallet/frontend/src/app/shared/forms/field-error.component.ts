import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-field-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message()) {
      <p class="field-error" role="alert" [id]="errorId()">{{ message() }}</p>
    }
  `,
  styles: `
    .field-error {
      margin: 0.25rem 0 0;
      color: #b00020;
      font-size: 0.875rem;
    }
  `,
})
export class FieldErrorComponent {
  readonly errorId = input.required<string>();
  readonly message = input<string | null>(null);
}

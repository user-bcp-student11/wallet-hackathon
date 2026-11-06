import { Directive, ElementRef, Injector, afterNextRender, effect, inject, input, output, untracked } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FieldError, StepValues } from '../../../core/api/api.models';
import { applyServerErrors, fieldErrorMessage, focusFirstError } from '../../../shared/forms/form-errors';
import { MESSAGES } from '../../../shared/i18n/messages.es-pe';

@Directive()
export abstract class StepFormBase {
  readonly serverErrors = input<FieldError[]>([]);
  readonly submitting = input(false);
  readonly isLastStep = input(false);
  readonly submitted = output<StepValues>();

  protected abstract readonly form: FormGroup;
  protected readonly messages = MESSAGES;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  constructor() {
    effect(() => {
      const errors = this.serverErrors();
      if (errors.length === 0) {
        return;
      }
      untracked(() => {
        applyServerErrors(this.form, errors);
        this.focusFirstErrorAfterRender();
      });
    });
  }

  protected onSubmit(): void {
    Object.values(this.form.controls).forEach((control) => control.updateValueAndValidity({ onlySelf: true }));
    this.form.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstErrorAfterRender();
      return;
    }
    this.submitted.emit(this.values());
  }

  protected primaryLabel(): string {
    if (this.submitting()) {
      return MESSAGES.actions.submitting;
    }
    return this.isLastStep() ? MESSAGES.actions.finish : MESSAGES.actions.continue;
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

  private values(): StepValues {
    return Object.fromEntries(
      Object.entries(this.form.getRawValue() as Record<string, unknown>).map(([field, value]) => [
        field,
        typeof value === 'string' ? value.trim() : String(value),
      ]),
    );
  }

  private focusFirstErrorAfterRender(): void {
    afterNextRender(() => focusFirstError(this.host), { injector: this.injector });
  }
}

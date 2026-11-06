import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { FieldError, Onboarding, ProblemDetails, StepValues } from '../../core/api/api.models';
import { OnboardingApi } from '../../core/api/onboarding.api';
import { MESSAGES } from '../../shared/i18n/messages.es-pe';

@Injectable()
export class OnboardingStore {
  private readonly api = inject(OnboardingApi);

  readonly onboarding = signal<Onboarding | null>(null);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly fieldErrors = signal<FieldError[]>([]);
  readonly message = signal<string | null>(null);
  readonly codeSent = signal(false);

  start(): void {
    this.loading.set(true);
    this.message.set(null);
    this.api.start().subscribe({
      next: (onboarding) => {
        this.onboarding.set(onboarding);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.message.set(this.problemMessage(error));
        this.loading.set(false);
      },
    });
  }

  submit(values: StepValues): void {
    const current = this.onboarding();
    if (!current?.currentStep) {
      return;
    }
    this.submitting.set(true);
    this.message.set(null);
    this.api.submitStep(current.id, current.currentStep, values).subscribe({
      next: (onboarding) => {
        this.fieldErrors.set([]);
        this.codeSent.set(false);
        this.onboarding.set(onboarding);
        this.submitting.set(false);
      },
      error: (error: HttpErrorResponse) => this.handleSubmitError(error),
    });
  }

  requestOtp(phoneNumber: string): void {
    const current = this.onboarding();
    if (!current) {
      return;
    }
    this.message.set(null);
    this.api.requestOtp(current.id, phoneNumber).subscribe({
      next: () => this.codeSent.set(true),
      error: (error: HttpErrorResponse) => {
        const problem = error.error as ProblemDetails | null;
        if (error.status === 422 && problem?.errors) {
          this.fieldErrors.set(problem.errors);
          return;
        }
        this.message.set(this.problemMessage(error));
      },
    });
  }

  private handleSubmitError(error: HttpErrorResponse): void {
    const problem = error.error as ProblemDetails | null;
    this.submitting.set(false);
    if (error.status === 422 && problem?.errors) {
      this.fieldErrors.set(problem.errors);
      return;
    }
    if (error.status === 409) {
      this.start();
    }
    this.message.set(this.problemMessage(error));
  }

  private problemMessage(error: HttpErrorResponse): string {
    const problem = error.error as ProblemDetails | null;
    return problem?.detail ?? MESSAGES.app.genericError;
  }
}

import { Page, Route } from '@playwright/test';

const OTP_CODE = '123456';

const STEPS = [
  { code: 'phone', title: 'Verifica tu celular', instruction: 'Ingresa tu número de celular y el código que te enviaremos.' },
  { code: 'identity', title: 'Tus datos personales', instruction: 'Ingresa tu documento, nombres y fecha de nacimiento.' },
  { code: 'confirmation', title: 'Activa tu wallet', instruction: 'Acepta los términos y condiciones para activar tu wallet.' },
];

type Values = Record<string, string>;

/** Backend simulado con el contrato de docs/architecture/openapi.yaml. */
export class MockBackend {
  private completed: string[] = [];

  constructor(private readonly page: Page) {}

  async install(): Promise<void> {
    await this.page.route('**/api/v1/onboardings', (route) => this.json(route, 201, this.view()));
    await this.page.route('**/api/v1/onboardings/*/otp', (route) => route.fulfill({ status: 204 }));
    await this.page.route('**/api/v1/onboardings/*/steps/*', (route) => this.submitStep(route));
    await this.page.route('**/api/v1/wallet/payments-access', (route) =>
      this.isCompleted()
        ? this.json(route, 200, { enabled: true })
        : this.json(route, 403, { detail: 'Completa tu registro para activar tu wallet y poder pagar.' }),
    );
  }

  private submitStep(route: Route): Promise<void> {
    const step = route.request().url().split('/').pop()!;
    const values: Values = route.request().postDataJSON().values;
    const errors = this.validate(step, values);
    if (errors.length > 0) {
      return this.json(route, 422, { title: 'Datos inválidos', status: 422, errors });
    }
    this.completed.push(step);
    return this.json(route, 200, this.view());
  }

  private validate(step: string, values: Values): { field: string; message: string }[] {
    if (step === 'phone' && values['otpCode'] !== OTP_CODE) {
      return [{ field: 'otpCode', message: 'El código es incorrecto. Revísalo e inténtalo de nuevo.' }];
    }
    return [];
  }

  private isCompleted(): boolean {
    return this.completed.length === STEPS.length;
  }

  private view() {
    const current = STEPS.find((step) => !this.completed.includes(step.code));
    const currentIndex = current ? STEPS.indexOf(current) : STEPS.length - 1;
    return {
      id: '0b6c1f3a-5f4e-4a52-9d57-1f3a2c9e7a10',
      status: current ? 'IN_PROGRESS' : 'COMPLETED',
      stepNumber: currentIndex + 1,
      totalSteps: STEPS.length,
      currentStep: current?.code,
      instruction: current?.instruction,
      nextStepLabel: current ? STEPS[currentIndex + 1]?.title : undefined,
      steps: STEPS.map((step) => ({
        code: step.code,
        title: step.title,
        status: this.completed.includes(step.code) ? 'COMPLETED' : step === current ? 'CURRENT' : 'PENDING',
      })),
      walletActive: this.isCompleted(),
    };
  }

  private json(route: Route, status: number, body: unknown): Promise<void> {
    return route.fulfill({
      status,
      contentType: status >= 400 ? 'application/problem+json' : 'application/json',
      body: JSON.stringify(body),
    });
  }
}

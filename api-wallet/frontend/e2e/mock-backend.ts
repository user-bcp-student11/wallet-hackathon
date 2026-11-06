import { Page, Route } from '@playwright/test';

interface Registration {
  id: string;
  wallet_id: string;
  scenario: string;
  status: string;
}

const STATUS_BY_SCENARIO: Record<string, string> = {
  APPROVED: 'ACTIVE',
  REJECTED: 'REJECTED',
  MANUAL_REVIEW: 'PENDING',
};

/** Backend simulado con el contrato de openapi-wallet.yml (tag "W1 · Registro y activación"). */
export class MockBackend {
  private readonly registrations: Registration[] = [];

  constructor(private readonly page: Page) {}

  async install(): Promise<void> {
    await this.page.route('**/kyc/verifications', (route) => this.create(route));
    await this.page.route('**/kyc/verifications/*', (route) => this.getVerification(route));
    await this.page.route('**/wallets/*', (route) => this.getWallet(route));
  }

  private create(route: Route): Promise<void> {
    const { scenario = 'APPROVED' } = route.request().postDataJSON();
    if (scenario === 'UNAVAILABLE') {
      return this.json(route, 503, { error: 'KYC_UNAVAILABLE' });
    }
    const index = this.registrations.length + 1;
    const registration = {
      id: `kyc-${index}`,
      wallet_id: `wal-${index}`,
      scenario,
      status: STATUS_BY_SCENARIO[scenario],
    };
    this.registrations.push(registration);
    return this.json(route, 201, registration);
  }

  private getVerification(route: Route): Promise<void> {
    const registration = this.registrations.find((item) => item.id === this.lastSegment(route));
    return registration ? this.json(route, 200, registration) : this.json(route, 404, { error: 'NOT_FOUND' });
  }

  private getWallet(route: Route): Promise<void> {
    const registration = this.registrations.find((item) => item.wallet_id === this.lastSegment(route));
    return registration
      ? this.json(route, 200, {
          id: registration.wallet_id,
          status: registration.status,
          balance: 0,
          reserved: 0,
          available: 0,
          currency: 'PEN',
        })
      : this.json(route, 404, { error: 'NOT_FOUND' });
  }

  private lastSegment(route: Route): string {
    return route.request().url().split('/').pop()!;
  }

  private json(route: Route, status: number, body: unknown): Promise<void> {
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  }
}

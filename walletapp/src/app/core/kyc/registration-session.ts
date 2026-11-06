import { Service, computed, signal } from '@angular/core';
import { KycVerification } from './kyc.model';

/** Conserva en memoria el resultado del registro. No se persiste en storage. */
@Service()
export class RegistrationSession {
  private readonly verificationSignal = signal<KycVerification | undefined>(undefined);

  readonly verification = this.verificationSignal.asReadonly();
  readonly verificationId = computed(() => this.verificationSignal()?.id);
  readonly walletId = computed(() => this.verificationSignal()?.wallet_id);

  start(verification: KycVerification): void {
    this.verificationSignal.set(verification);
  }
}

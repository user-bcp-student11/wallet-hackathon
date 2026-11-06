import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { KycRequest, KycVerification, Wallet } from '../../core/api/api.models';
import { apiErrorMessage } from '../../core/api/api-error';
import { KycApi } from '../../core/api/kyc.api';
import { WalletApi } from '../../core/api/wallet.api';

export interface RegistrationResult {
  verification: KycVerification;
  wallet: Wallet;
}

interface CreatedRegistration {
  verificationId: string;
  walletId: string;
}

@Injectable()
export class RegistrationStore {
  private readonly kycApi = inject(KycApi);
  private readonly walletApi = inject(WalletApi);

  readonly submitting = signal(false);
  readonly loadingResult = signal(false);
  readonly message = signal<string | null>(null);
  readonly result = signal<RegistrationResult | null>(null);
  // Alta ya creada cuya consulta falló: se reintenta la lectura sin crear otra wallet.
  readonly created = signal<CreatedRegistration | null>(null);

  submit(request: KycRequest): void {
    this.submitting.set(true);
    this.message.set(null);
    this.kycApi.createVerification(request).subscribe({
      next: (verification) => {
        this.submitting.set(false);
        this.created.set({ verificationId: verification.id, walletId: verification.wallet_id });
        this.loadResult();
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.message.set(apiErrorMessage(error));
      },
    });
  }

  loadResult(): void {
    const created = this.created();
    if (!created) {
      return;
    }
    this.loadingResult.set(true);
    this.message.set(null);
    forkJoin({
      verification: this.kycApi.getVerification(created.verificationId),
      wallet: this.walletApi.getWallet(created.walletId),
    }).subscribe({
      next: (result) => {
        this.result.set(result);
        this.loadingResult.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.message.set(apiErrorMessage(error));
        this.loadingResult.set(false);
      },
    });
  }

  reset(): void {
    this.result.set(null);
    this.created.set(null);
    this.message.set(null);
  }
}

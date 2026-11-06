import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { ApiError, toApiError } from '../../core/api/api-error';
import { KycApi } from '../../core/api/kyc.api';
import { CreateKycRequest, Kyc, Wallet } from '../../core/api/kyc.models';
import { WalletApi } from '../../core/api/wallet.api';

type Phase = 'idle' | 'submitting' | 'refreshing';

/**
 * Estado del registro, solo en memoria (no se guarda en el navegador: al recargar se pierde).
 */
@Injectable({ providedIn: 'root' })
export class OnboardingStore {
  private readonly kycApi = inject(KycApi);
  private readonly walletApi = inject(WalletApi);

  private readonly phase = signal<Phase>('idle');
  readonly kyc = signal<Kyc | null>(null);
  readonly wallet = signal<Wallet | null>(null);
  /** Error al crear la verificación (formulario). */
  readonly error = signal<ApiError | null>(null);
  /** Error al consultar el resultado (verificación o wallet) después de crearla. */
  readonly resultError = signal<ApiError | null>(null);

  readonly submitting = computed(() => this.phase() === 'submitting');
  readonly refreshing = computed(() => this.phase() === 'refreshing');

  /** Crea la verificación y, si se creó, consulta su wallet. */
  register(request: CreateKycRequest): void {
    if (this.phase() !== 'idle') return;
    this.phase.set('submitting');
    this.error.set(null);
    this.kycApi.create(request).subscribe({
      next: (kyc) => {
        this.kyc.set(kyc);
        this.loadWallet(kyc);
      },
      error: (err: unknown) => {
        this.error.set(toApiError(err));
        this.phase.set('idle');
      },
    });
  }

  /** Vuelve a consultar la verificación y su wallet (útil mientras está `PENDING`). */
  refresh(): void {
    const current = this.kyc();
    if (!current || this.phase() !== 'idle') return;
    this.phase.set('refreshing');
    this.resultError.set(null);
    this.kycApi
      .get(current.id)
      .pipe(
        switchMap((kyc): Observable<Wallet> => {
          this.kyc.set(kyc);
          return this.walletApi.get(kyc.wallet_id);
        }),
      )
      .subscribe({
        next: (wallet) => {
          this.wallet.set(wallet);
          this.phase.set('idle');
        },
        error: (err: unknown) => {
          this.resultError.set(toApiError(err));
          this.phase.set('idle');
        },
      });
  }

  /** Descarta el resultado para iniciar un nuevo registro. */
  reset(): void {
    this.kyc.set(null);
    this.wallet.set(null);
    this.error.set(null);
    this.resultError.set(null);
    this.phase.set('idle');
  }

  private loadWallet(kyc: Kyc): void {
    this.wallet.set(null);
    this.resultError.set(null);
    this.walletApi.get(kyc.wallet_id).subscribe({
      next: (wallet) => {
        this.wallet.set(wallet);
        this.phase.set('idle');
      },
      error: (err: unknown) => {
        this.resultError.set(toApiError(err));
        this.phase.set('idle');
      },
    });
  }
}

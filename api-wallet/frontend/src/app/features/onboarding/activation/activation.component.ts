import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { WalletApi } from '../../../core/api/wallet.api';
import { MESSAGES } from '../../../shared/i18n/messages.es-pe';

type AccessState = 'checking' | 'enabled' | 'denied' | 'error';

@Component({
  selector: 'app-activation',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './activation.component.css',
  template: `
    @switch (state()) {
      @case ('checking') {
        <p role="status">{{ messages.activation.checking }}</p>
      }
      @case ('enabled') {
        <h2>{{ messages.activation.title }}</h2>
        <p>{{ messages.activation.description }}</p>
        <a class="primary" routerLink="/pagos">{{ messages.actions.goToPayments }}</a>
      }
      @case ('denied') {
        <p role="alert">{{ messages.activation.notActive }}</p>
        <button type="button" class="primary" disabled>{{ messages.actions.goToPayments }}</button>
      }
      @case ('error') {
        <p role="alert">{{ messages.app.genericError }}</p>
      }
    }
  `,
})
export class ActivationComponent {
  protected readonly messages = MESSAGES;
  protected readonly state = signal<AccessState>('checking');

  constructor() {
    inject(WalletApi)
      .paymentsAccess()
      .subscribe({
        next: (access) => this.state.set(access.enabled ? 'enabled' : 'denied'),
        error: (error: HttpErrorResponse) => this.state.set(error.status === 403 ? 'denied' : 'error'),
      });
  }
}

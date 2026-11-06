import { Component, ElementRef, afterRenderEffect, computed, input, output, viewChild } from '@angular/core';
import { ApiError } from '../../core/api/api-error';
import { Kyc, Wallet } from '../../core/api/kyc.models';
import { MESSAGES, errorMessage } from '../../core/i18n/messages.es-pe';
import { RouterLink } from '@angular/router';
import { PenCentsPipe } from '../../shared/format/pen-cents.pipe';
import { Icon } from '../../shared/ui/icon';

/** Resultado del registro según el estado de la verificación: ACTIVE, PENDING o REJECTED. */
@Component({
  selector: 'app-registration-result',
  imports: [PenCentsPipe, RouterLink, Icon],
  templateUrl: './registration-result.html',
  styleUrl: './registration-result.css',
})
export class RegistrationResult {
  readonly kyc = input.required<Kyc>();
  readonly wallet = input<Wallet | null>(null);
  readonly error = input<ApiError | null>(null);
  readonly refreshing = input(false);

  readonly refresh = output<void>();
  readonly restart = output<void>();

  protected readonly t = MESSAGES.result;
  protected readonly statusLabels = MESSAGES.status;

  protected readonly title = computed(() => {
    switch (this.kyc().status) {
      case 'ACTIVE':
        return this.t.activeTitle;
      case 'PENDING':
        return this.t.pendingTitle;
      case 'REJECTED':
        return this.t.rejectedTitle;
    }
  });

  protected readonly body = computed(() => {
    switch (this.kyc().status) {
      case 'ACTIVE':
        return this.t.activeBody;
      case 'PENDING':
        return this.t.pendingBody;
      case 'REJECTED':
        return this.t.rejectedBody;
    }
  });

  protected readonly errorText = computed(() => {
    const error = this.error();
    return error ? `${this.t.walletUnavailable} ${errorMessage(error.code)}` : null;
  });

  private readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('heading');

  constructor() {
    // Al mostrar un resultado o cambiar su estado, el foco va al encabezado para lectores de pantalla.
    afterRenderEffect(() => {
      this.kyc().status;
      this.heading().nativeElement.focus();
    });
  }
}

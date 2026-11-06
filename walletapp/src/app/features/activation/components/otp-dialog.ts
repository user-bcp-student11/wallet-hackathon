import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, form, submit, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { OtpApi } from '../../../core/otp/otp-api';
import {
  OtpError,
  describeOtpRequestError,
  describeOtpVerifyError,
} from '../../../core/otp/otp-error';
import { OtpChallenge } from '../../../core/otp/otp.model';

/**
 * Modal para ingresar el código OTP SIMULADO (solo demostración).
 *
 * Usa el `<dialog>` nativo: en el navegador `showModal()` atrapa el foco, bloquea el resto de la
 * página y Escape lo cierra. El código lo imprime el servidor en su consola; la aplicación nunca lo
 * recibe. Emite `verified` con el `challengeId` cuando el código es correcto; el padre continúa con
 * la activación.
 */
@Component({
  imports: [FormField],
  selector: 'app-otp-dialog',
  styleUrl: './otp-dialog.css',
  templateUrl: './otp-dialog.html',
})
export class OtpDialog {
  private readonly otpApi = inject(OtpApi);

  /** GUID de la persona a la que se le genera el código (para reenviar). */
  readonly userId = input.required<string>();
  readonly challenge = input.required<OtpChallenge>();
  /** `true` mientras el padre activa la wallet tras verificar el código. */
  readonly busy = input(false);

  /** challengeId del código verificado. */
  readonly verified = output<string>();
  readonly dismissed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');

  /** Reto vigente: arranca con el recibido y se reemplaza al reenviar el código. */
  protected readonly current = linkedSignal(() => this.challenge());

  protected readonly model = signal({ code: '' });
  protected readonly otpForm = form(this.model, (path) => {
    validate(path.code, ({ value }) =>
      value().trim() === ''
        ? { kind: 'required', message: 'Ingresa el código de verificación.' }
        : undefined,
    );
  });

  protected readonly error = signal<OtpError | undefined>(undefined);
  protected readonly info = signal<string | undefined>(undefined);
  protected readonly resending = signal(false);
  /** El código actual ya no sirve (vencido, bloqueado o reemplazado): hay que pedir otro. */
  protected readonly needsNewCode = signal(false);

  protected readonly verifying = computed(() => this.otpForm().submitting());
  protected readonly working = computed(() => this.verifying() || this.resending() || this.busy());

  protected readonly codeError = computed(() => {
    const state = this.otpForm.code();
    return state.touched() ? state.errors()[0]?.message : undefined;
  });

  protected readonly validity = computed(() => {
    const seconds = this.current().expiresInSeconds;
    if (seconds >= 60) {
      const minutes = Math.ceil(seconds / 60);
      return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    }
    return `${seconds} segundos`;
  });

  constructor() {
    afterNextRender(() => {
      const element = this.dialog().nativeElement;
      // jsdom (pruebas) no implementa showModal(): se abre sin modo modal.
      if (typeof element.showModal === 'function') {
        element.showModal();
      } else {
        element.setAttribute('open', '');
      }
      this.codeInput()?.nativeElement.focus();
    });
  }

  /** Verifica el código. `submit()` ignora nuevos envíos mientras el anterior sigue en curso. */
  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.needsNewCode() || this.busy() || this.resending()) {
      return;
    }
    this.error.set(undefined);
    this.info.set(undefined);

    await submit(this.otpForm, {
      action: async () => {
        const challengeId = this.current().challengeId;
        try {
          await firstValueFrom(this.otpApi.verifyCode(challengeId, this.model().code.trim()));
          this.verified.emit(challengeId);
        } catch (err) {
          const failure = describeOtpVerifyError(err);
          this.error.set(failure);
          this.needsNewCode.set(failure.requiresNewCode);
          if (!failure.requiresNewCode) {
            this.codeInput()?.nativeElement.select();
          }
        }
        return undefined;
      },
      onInvalid: () => this.codeInput()?.nativeElement.focus(),
    });
  }

  /** Pide un código nuevo (reemplaza al anterior). */
  protected async resend(): Promise<void> {
    if (this.working()) {
      return;
    }
    this.resending.set(true);
    this.error.set(undefined);
    this.info.set(undefined);
    try {
      const next = await firstValueFrom(this.otpApi.requestCode(this.userId()));
      this.current.set(next);
      this.model.set({ code: '' });
      this.otpForm().reset();
      this.needsNewCode.set(false);
      this.info.set('Generamos un código nuevo. Revisa la consola del servidor.');
      this.codeInput()?.nativeElement.focus();
    } catch (err) {
      this.error.set(describeOtpRequestError(err));
    } finally {
      this.resending.set(false);
    }
  }

  /** Cancelar y Escape: no se puede cerrar mientras se está activando. */
  protected dismiss(event?: Event): void {
    // Escape nativo dispararía `cancel` y cerraría el diálogo por su cuenta: lo gestiona el padre.
    event?.preventDefault();
    if (this.busy() || this.verifying()) {
      return;
    }
    this.dismissed.emit();
  }
}

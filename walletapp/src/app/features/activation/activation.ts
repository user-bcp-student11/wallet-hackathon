import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, form, submit, validate } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  IDENTITY_DOCUMENT_TYPES,
  IdentityDocumentType,
} from '../../core/kyc/identity-document.model';
import { KycApi } from '../../core/kyc/kyc-api';
import { KycError, describeKycError } from '../../core/kyc/kyc-error';
import { KycStatus, KycVerification } from '../../core/kyc/kyc.model';
import { RegistrationSession } from '../../core/kyc/registration-session';
import { OtpApi } from '../../core/otp/otp-api';
import { describeOtpRequestError } from '../../core/otp/otp-error';
import { OtpChallenge } from '../../core/otp/otp.model';
import { PersonApi } from '../../core/person/person-api';
import { describePersonLookupError } from '../../core/person/person-error';
import { Wallet } from '../../core/wallet/wallet.model';
import { WalletApi } from '../../core/wallet/wallet-api';
import { OtpDialog } from './components/otp-dialog';

interface ActivationModel {
  /** Cadena vacía hasta que la persona elige un tipo (los campos no usan null). */
  documentType: IdentityDocumentType | '';
  documentNumber: string;
}

/** Persona encontrada por POST /persons/lookup: solo lo necesario para activar. */
interface FoundPerson {
  userId: string;
  documentType: IdentityDocumentType;
  documentNumber: string;
}

interface StatusView {
  /** Texto corto para la etiqueta de estado. */
  label: string;
  title: string;
  detail: string;
}

const STATUS_VIEW: Record<KycStatus, StatusView> = {
  ACTIVE: {
    label: 'Activa',
    title: '¡Tu wallet de prueba está activa!',
    detail: 'La verificación simulada devolvió «aprobada» y tu wallet de prueba está activa.',
  },
  PENDING: {
    label: 'Pendiente de revisión',
    title: 'Tu wallet de prueba está en revisión',
    detail:
      'La verificación simulada quedó pendiente. Falta la decisión de una persona del equipo para activar la wallet y, mientras tanto, no se pueden hacer pagos.',
  },
  REJECTED: {
    label: 'Rechazada',
    title: 'No pudimos activar tu wallet de prueba',
    detail:
      'La verificación simulada fue rechazada y la wallet no puede hacer pagos. Puedes volver a intentarlo.',
  },
};

const PEN = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

/**
 * Pantalla de activación de la wallet (ruta /activacion), en tres pasos dentro de la misma tarjeta:
 *  1. Formulario: tipo y número de documento → consulta la persona (POST /persons/lookup).
 *  2. Persona encontrada: permite iniciar la activación (POST /kyc/verifications con su userId).
 *  3. Resultado: estado de la wallet y saldo (GET /wallets/{id}).
 *
 * La verificación es simulada y solo debe usarse con datos ficticios. Si la persona no existe solo
 * se informa: el alta de personas nuevas no está implementada.
 */
@Component({
  imports: [FormField, NgTemplateOutlet, OtpDialog, RouterLink],
  selector: 'app-activation',
  styleUrl: './activation.css',
  templateUrl: './activation.html',
})
export class Activation {
  private readonly personApi = inject(PersonApi);
  private readonly otpApi = inject(OtpApi);
  private readonly api = inject(KycApi);
  private readonly walletApi = inject(WalletApi);
  private readonly session = inject(RegistrationSession);
  private readonly injector = inject(Injector);

  private readonly documentTypeSelect =
    viewChild<ElementRef<HTMLSelectElement>>('documentTypeSelect');
  private readonly documentNumberInput =
    viewChild<ElementRef<HTMLInputElement>>('documentNumberInput');
  private readonly foundHeading = viewChild<ElementRef<HTMLElement>>('foundHeading');
  private readonly resultHeading = viewChild<ElementRef<HTMLElement>>('resultHeading');
  private readonly activateButton = viewChild<ElementRef<HTMLButtonElement>>('activateButton');

  protected readonly documentTypes = IDENTITY_DOCUMENT_TYPES;

  protected readonly model = signal<ActivationModel>({ documentType: '', documentNumber: '' });

  /**
   * Validaciones mínimas: solo que el tipo esté elegido y el número no esté vacío.
   * Longitud, caracteres permitidos y dígito verificador de DNI y CE están PENDIENTES de definir
   * con producto (ver reglas-de-negocio/documento-de-identidad.md); no se asumen aquí.
   */
  protected readonly activationForm = form(this.model, (path) => {
    validate(path.documentType, ({ value }) =>
      value() === ''
        ? {
            kind: 'required',
            message: 'Selecciona el tipo de documento: DNI o carné de extranjería (CE).',
          }
        : undefined,
    );
    validate(path.documentNumber, ({ value }) =>
      value().trim() === ''
        ? {
            kind: 'required',
            message:
              'Ingresa el número de tu documento. En este entorno de prueba usa un número ficticio.',
          }
        : undefined,
    );
  });

  protected readonly person = signal<FoundPerson | undefined>(undefined);
  protected readonly result = signal<KycVerification | undefined>(undefined);
  /** `true` si la persona ya tenía una wallet y el servidor devolvió la existente. */
  protected readonly existing = signal(false);
  /** Saldos consultados con GET /wallets/{id}; `undefined` si no se pudieron obtener. */
  protected readonly wallet = signal<Wallet | undefined>(undefined);
  protected readonly error = signal<KycError | undefined>(undefined);
  protected readonly activating = signal(false);
  /** Generando el código OTP simulado (clic en «Activar wallet»). */
  protected readonly requestingOtp = signal(false);
  /** Reto OTP pendiente de verificar: mientras existe se muestra el modal. */
  protected readonly otpChallenge = signal<OtpChallenge | undefined>(undefined);
  /**
   * Reto ya verificado cuya activación falló por un problema transitorio (503 o conexión): el
   * servidor no lo consumió, así que se reutiliza al reintentar sin pedir otro código.
   */
  private readonly verifiedOtp = signal<string | undefined>(undefined);

  /** Consultando la persona (envío del formulario). */
  protected readonly looking = computed(() => this.activationForm().submitting());
  protected readonly busy = computed(
    () => this.looking() || this.activating() || this.requestingOtp(),
  );

  protected readonly statusView = computed(() => {
    const verification = this.result();
    return verification ? STATUS_VIEW[verification.status] : undefined;
  });

  protected readonly availableBalance = computed(() => {
    const wallet = this.wallet();
    return wallet ? PEN.format(wallet.available / 100) : undefined;
  });

  protected readonly foundDocumentLabel = computed(() => {
    const person = this.person();
    const type = this.documentTypes.find((item) => item.value === person?.documentType);
    return person ? `${type?.label ?? person.documentType} · ${person.documentNumber}` : '';
  });

  /** Muestran el primer error de validación una vez que la persona interactuó con el campo. */
  protected readonly documentTypeError = computed(() => {
    const state = this.activationForm.documentType();
    return state.touched() ? state.errors()[0]?.message : undefined;
  });

  protected readonly documentNumberError = computed(() => {
    const state = this.activationForm.documentNumber();
    return state.touched() ? state.errors()[0]?.message : undefined;
  });

  /** Paso 1: consulta la persona. Un fallo de conexión NO se interpreta como «no existe». */
  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(undefined);

    // submit() ignora nuevos envíos mientras el anterior sigue en curso.
    await submit(this.activationForm, {
      action: async () => {
        const { documentType, documentNumber } = this.model();
        if (documentType === '') {
          return undefined;
        }
        try {
          const { userId } = await firstValueFrom(
            this.personApi.lookup({ documentType, documentNumber }),
          );
          this.person.set({ userId, documentType, documentNumber });
          this.focusAfterRender(this.foundHeading);
        } catch (err) {
          this.error.set(describePersonLookupError(err));
        }
        return undefined;
      },
      onInvalid: () => {
        // Aviso visible y anunciado (role="alert") cuando la validación falla al enviar.
        const typeInvalid = this.activationForm.documentType().errors().length > 0;
        const reason = (
          typeInvalid
            ? this.activationForm.documentType().errors()[0]
            : this.activationForm.documentNumber().errors()[0]
        )?.message;
        this.error.set({
          kind: 'validation',
          message: `Revisa los datos antes de continuar. ${reason ?? ''}`.trim(),
        });
        (typeInvalid
          ? this.documentTypeSelect()
          : this.documentNumberInput()
        )?.nativeElement.focus();
      },
    });
  }

  /**
   * Paso 2: «Activar wallet». Pide un código OTP simulado (el servidor lo imprime en su consola) y
   * abre el modal; al verificarse el código continúa la activación. Evita envíos simultáneos.
   */
  protected async activate(): Promise<void> {
    const person = this.person();
    if (!person || this.busy() || this.otpChallenge()) {
      return;
    }
    this.error.set(undefined);

    // Un código ya verificado que no se llegó a consumir (503 o conexión) se reutiliza.
    const verified = this.verifiedOtp();
    if (verified) {
      await this.completeActivation(verified);
      return;
    }

    this.requestingOtp.set(true);
    try {
      this.otpChallenge.set(await firstValueFrom(this.otpApi.requestCode(person.userId)));
    } catch (err) {
      this.error.set(describeOtpRequestError(err));
    } finally {
      this.requestingOtp.set(false);
    }
  }

  /** El modal confirmó el código: se activa la wallet con ese reto verificado. */
  protected async onOtpVerified(challengeId: string): Promise<void> {
    await this.completeActivation(challengeId);
  }

  /** Cancelar el modal: no se activa nada y el foco vuelve a «Activar wallet». */
  protected closeOtp(): void {
    this.otpChallenge.set(undefined);
    this.focusAfterRender(this.activateButton);
  }

  /** POST /kyc/verifications con el OTP verificado. */
  private async completeActivation(otpChallengeId: string): Promise<void> {
    const person = this.person();
    if (!person || this.activating()) {
      return;
    }
    this.activating.set(true);
    this.error.set(undefined);
    try {
      const { verification, existing } = await firstValueFrom(
        this.api.activateWallet({
          userId: person.userId,
          documentType: person.documentType,
          document: person.documentNumber,
          otpChallengeId,
        }),
      );
      this.session.start(verification);
      this.wallet.set(await this.loadWallet(verification.wallet_id));
      this.existing.set(existing);
      this.verifiedOtp.set(undefined);
      this.otpChallenge.set(undefined);
      this.result.set(verification);
      this.focusAfterRender(this.resultHeading);
    } catch (err) {
      const failure = describeKycError(err);
      this.error.set(failure);
      this.otpChallenge.set(undefined);
      // Con 503 o sin conexión el servidor no consumió el OTP: se puede reintentar con el mismo.
      const transient = failure.kind === 'unavailable' || failure.kind === 'connection';
      this.verifiedOtp.set(transient ? otpChallengeId : undefined);
      this.focusAfterRender(this.activateButton);
    } finally {
      this.activating.set(false);
    }
  }

  /** Vuelve al formulario conservando lo escrito, para corregirlo. */
  protected changeDocument(): void {
    if (this.busy() || this.otpChallenge()) {
      return;
    }
    this.person.set(undefined);
    this.verifiedOtp.set(undefined);
    this.error.set(undefined);
    this.focusAfterRender(this.documentTypeSelect);
  }

  protected startOver(): void {
    this.person.set(undefined);
    this.otpChallenge.set(undefined);
    this.verifiedOtp.set(undefined);
    this.result.set(undefined);
    this.existing.set(false);
    this.wallet.set(undefined);
    this.error.set(undefined);
    this.model.set({ documentType: '', documentNumber: '' });
    this.activationForm().reset();
    this.focusAfterRender(this.documentTypeSelect);
  }

  /** La consulta de saldos es complementaria: si falla, el resultado se muestra igual. */
  private async loadWallet(id: string): Promise<Wallet | undefined> {
    try {
      return await firstValueFrom(this.walletApi.getWallet(id));
    } catch {
      return undefined;
    }
  }

  private focusAfterRender(target: () => ElementRef<HTMLElement> | undefined): void {
    afterNextRender(() => target()?.nativeElement.focus(), { injector: this.injector });
  }
}

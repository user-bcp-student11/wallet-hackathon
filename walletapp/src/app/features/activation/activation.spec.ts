import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api-base-url';
import { KycScenario, KycStatus } from '../../core/kyc/kyc.model';
import { RegistrationSession } from '../../core/kyc/registration-session';
import { Activation } from './activation';

const LOOKUP_URL = 'http://mock.test/persons/lookup';
const OTP_URL = 'http://mock.test/otp/challenges';
const VERIFY_URL = 'http://mock.test/otp/challenges/otp-1/verify';
const KYC_URL = 'http://mock.test/kyc/verifications';
const WALLET_URL = 'http://mock.test/wallets/wallet-1';
const USER_ID = '11111111-2222-4333-8444-555555555555';
// Números FICTICIOS de prueba (no son datos reales ni reglas de DNI/CE).
const DNI_NUMBER = '00000001';
const CE_NUMBER = 'ABC-0002';

const CHALLENGE = { challengeId: 'otp-1', expiresInSeconds: 300 };
const CREATED = { status: 201, statusText: 'Created' };
const OK = { status: 200, statusText: 'OK' };

function kycResponse(status: KycStatus, id = 'kyc-1', walletId = 'wallet-1') {
  const scenario: KycScenario =
    status === 'ACTIVE' ? 'APPROVED' : status === 'PENDING' ? 'MANUAL_REVIEW' : 'REJECTED';
  return { id, wallet_id: walletId, scenario, status };
}

function walletResponse(status: KycStatus, available = 0) {
  return { id: 'wallet-1', status, balance: available, reserved: 0, available, currency: 'PEN' };
}

describe('Activation', () => {
  let fixture: ComponentFixture<Activation>;
  let http: HttpTestingController;
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Activation],
      providers: [
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: 'http://mock.test' },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Activation);
    root = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const typeSelect = () => root.querySelector<HTMLSelectElement>('#document-type')!;
  const numberInput = () => root.querySelector<HTMLInputElement>('#document-number')!;
  const submitButton = () => root.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const activateButton = () => root.querySelector<HTMLButtonElement>('[data-testid="activate"]')!;
  const otherDocumentButton = () =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.textContent?.includes('Usar otro documento'),
    )!;
  const text = () => root.textContent ?? '';
  const alertText = () => root.querySelector('[role="alert"]')?.textContent?.trim() ?? '';
  const alertKind = () => root.querySelector('[role="alert"] .alert')?.getAttribute('data-kind');

  /** Espera a que Angular procese cambios sin depender de `whenStable`, que aguarda solicitudes HTTP pendientes. */
  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 20));
    fixture.detectChanges();
  }

  async function selectType(value: string): Promise<void> {
    typeSelect().value = value;
    // Los navegadores disparan `input` al elegir una opción; es el evento que escucha [formField].
    typeSelect().dispatchEvent(new Event('input'));
    await settle();
  }

  async function typeNumber(value: string): Promise<void> {
    numberInput().value = value;
    numberInput().dispatchEvent(new Event('input'));
    await settle();
  }

  async function fillForm(type = 'DNI', number = DNI_NUMBER): Promise<void> {
    await selectType(type);
    await typeNumber(number);
  }

  async function submit(): Promise<void> {
    submitButton().click();
    await settle();
  }

  /** Paso 1 completo: llena el formulario y responde la consulta con la persona encontrada. */
  async function reachFoundStep(type = 'DNI', number = DNI_NUMBER): Promise<void> {
    await fillForm(type, number);
    await submit();
    http.expectOne(LOOKUP_URL).flush({ userId: USER_ID });
    await settle();
  }

  async function clickActivate(): Promise<void> {
    activateButton().click();
    await settle();
  }

  /** «Activar wallet»: se solicita el OTP y se abre el modal. */
  async function reachOtpStep(): Promise<void> {
    await clickActivate();
    http.expectOne(OTP_URL).flush(CHALLENGE, CREATED);
    await settle();
  }

  const codeInput = () => root.querySelector<HTMLInputElement>('#otp-code')!;
  const dialogSubmit = () => root.querySelector<HTMLButtonElement>('dialog button[type="submit"]')!;
  const dialogText = () => root.querySelector('dialog')?.textContent ?? '';

  /** Escribe el código en el modal y lo envía. */
  async function enterCode(code = '123456'): Promise<void> {
    codeInput().value = code;
    codeInput().dispatchEvent(new Event('input'));
    await settle();
    dialogSubmit().click();
    await settle();
  }

  /** Código correcto: el servidor verifica el reto y la activación continúa. */
  async function passOtp(): Promise<void> {
    await reachOtpStep();
    await enterCode();
    http.expectOne(VERIFY_URL).flush({ challengeId: 'otp-1', status: 'VERIFIED' });
    await settle();
  }

  /** Responde POST /kyc/verifications (201 o 200) y, a continuación, GET /wallets/{id}. */
  async function completeActivation(
    status: KycStatus,
    options: { existing?: boolean; available?: number } = {},
  ): Promise<void> {
    http.expectOne(KYC_URL).flush(kycResponse(status), options.existing ? OK : CREATED);
    await settle();
    http.expectOne(WALLET_URL).flush(walletResponse(status, options.available ?? 0));
    await settle();
  }

  describe('diseño y contenido', () => {
    it('ofrece una opción para volver al inicio', () => {
      const back = root.querySelector<HTMLAnchorElement>('a.back')!;

      expect(back.textContent).toContain('Volver al inicio');
      expect(back.getAttribute('href')).toBe('/');
    });

    it('no muestra una barra de pasos con un total inventado', () => {
      expect(root.querySelector('.progress, .step, [role="progressbar"]')).toBeNull();
      expect(text()).not.toMatch(/\d+\s*\/\s*\d+/);
    });

    it('indica de forma discreta que la verificación es simulada y que se usen datos ficticios', () => {
      const note = root.querySelector('.sim-note')?.textContent ?? '';

      expect(note).toContain('Verificación simulada');
      expect(note).toContain('únicamente datos ficticios');
      expect(note).toContain('no ingreses tu DNI ni tu carné de extranjería reales');
    });

    it('mantiene la indicación de simulación al confirmar la persona', async () => {
      await reachFoundStep();

      expect(root.querySelector('.sim-note')?.textContent).toContain('Verificación simulada');
    });
  });

  describe('formulario', () => {
    it('muestra el título y la descripción de la activación', () => {
      expect(root.querySelector('h1')?.textContent).toContain('Activa tu wallet');
      expect(text()).toContain(
        'Primero, cuéntanos quién eres. Ingresa tu documento para comenzar.',
      );
    });

    it('permite seleccionar DNI o carné de extranjería e ingresar el número por separado', () => {
      const options = Array.from(typeSelect().options).map((option) => option.value);

      expect(root.querySelector('label[for="document-type"]')?.textContent).toContain(
        'Tipo de documento',
      );
      expect(options).toEqual(['', 'DNI', 'CE']);
      expect(typeSelect().textContent).toContain('Carné de extranjería');
      expect(root.querySelector('label[for="document-number"]')?.textContent).toContain(
        'Número de documento',
      );
      expect(numberInput().placeholder).toBe('Ingresa tu número');
      expect(submitButton().textContent).toContain('Continuar');
    });

    it('no menciona prefijos técnicos como TEST-', () => {
      expect(text()).not.toContain('TEST-');
      expect(numberInput().value).toBe('');
    });

    it('asocia la ayuda al campo para lectores de pantalla', () => {
      expect(numberInput().getAttribute('aria-describedby')).toBe('document-number-hint');
      expect(root.querySelector('#document-number-hint')?.textContent).toContain(
        'Revisa que coincida con tu documento.',
      );
    });

    it('exige el tipo y el número, y no consulta nada si faltan', async () => {
      await submit();

      expect(text()).toContain('Selecciona el tipo de documento');
      expect(text()).toContain('Ingresa el número de tu documento');
      expect(typeSelect().getAttribute('aria-invalid')).toBe('true');
      expect(numberInput().getAttribute('aria-invalid')).toBe('true');
      http.expectNone(LOOKUP_URL);
    });

    it('muestra una alerta amable y enfoca el tipo cuando no se eligió', async () => {
      await typeNumber(DNI_NUMBER);
      await submit();

      expect(alertText()).toContain('Revisa los datos antes de continuar.');
      expect(document.activeElement).toBe(typeSelect());
      http.expectNone(LOOKUP_URL);
    });

    it('enfoca el número cuando solo falta el número', async () => {
      await selectType('CE');
      await submit();

      expect(alertText()).toContain('Ingresa el número de tu documento');
      expect(document.activeElement).toBe(numberInput());
      http.expectNone(LOOKUP_URL);
    });

    it('rechaza un número formado solo por espacios', async () => {
      await fillForm('DNI', '   ');
      await submit();

      expect(text()).toContain('Ingresa el número de tu documento');
      http.expectNone(LOOKUP_URL);
    });

    it('no asume formato ni longitud: consulta cualquier número no vacío', async () => {
      await fillForm('CE', 'ab-12');
      await submit();

      const req = http.expectOne(LOOKUP_URL);
      expect(req.request.body.documentNumber).toBe('ab-12');
      req.flush({ userId: USER_ID });
      await settle();
    });
  });

  describe('consulta de la persona', () => {
    for (const [label, type, number] of [
      ['DNI', 'DNI', DNI_NUMBER],
      ['carné de extranjería', 'CE', CE_NUMBER],
    ]) {
      it(`consulta con ${label}: POST /persons/lookup con el tipo y el número tal como se escribió`, async () => {
        await fillForm(type, number);
        await submit();

        const req = http.expectOne(LOOKUP_URL);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ documentType: type, documentNumber: number });
        expect(req.request.urlWithParams).not.toContain(number);
        req.flush({ userId: USER_ID });
        await settle();
      });
    }

    it('no normaliza el número: lo envía exactamente como se escribió', async () => {
      await fillForm('DNI', ' 0001 ');
      await submit();

      const req = http.expectOne(LOOKUP_URL);
      expect(req.request.body.documentNumber).toBe(' 0001 ');
      req.flush({ userId: USER_ID });
      await settle();
    });

    it('muestra carga y evita consultas simultáneas', async () => {
      await fillForm();
      await submit();

      expect(submitButton().disabled).toBe(true);
      expect(text()).toContain('Consultando…');
      expect(root.querySelector('.spinner')).not.toBeNull();
      expect(root.querySelector('form')?.getAttribute('aria-busy')).toBe('true');

      // Un segundo envío mientras la consulta sigue en curso no genera otra llamada.
      root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      const requests = http.match(LOOKUP_URL);
      expect(requests).toHaveLength(1);
      requests[0].flush({ userId: USER_ID });
      await settle();
    });

    it('si la persona existe, informa que se encontró y permite iniciar su activación', async () => {
      await reachFoundStep();

      expect(root.querySelector('h1')?.textContent).toContain('Encontramos tu registro');
      expect(root.querySelector('[data-testid="found-document"]')?.textContent).toContain(
        `DNI · ${DNI_NUMBER}`,
      );
      expect(activateButton().textContent).toContain('Activar wallet');
      expect(activateButton().disabled).toBe(false);
      expect(root.querySelector('form')).toBeNull();
    });

    it('con CE muestra el tipo completo en la confirmación', async () => {
      await reachFoundStep('CE', CE_NUMBER);

      expect(root.querySelector('[data-testid="found-document"]')?.textContent).toContain(
        `Carné de extranjería (CE) · ${CE_NUMBER}`,
      );
    });

    it('no muestra el GUID ni otros datos de la persona', async () => {
      await reachFoundStep();

      expect(text()).not.toContain(USER_ID);
      expect(text()).not.toMatch(/nombre|apellido|nacimiento/i);
    });

    it('si no existe, informa explícitamente que no se encontró y no ofrece activar ni dar de alta', async () => {
      await fillForm();
      await submit();
      http
        .expectOne(LOOKUP_URL)
        .flush({ error: 'PERSON_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
      await settle();

      expect(alertText()).toContain('No encontramos a nadie con ese documento');
      expect(alertKind()).toBe('not-found');
      expect(root.querySelector('[data-testid="activate"]')).toBeNull();
      expect(root.querySelectorAll('input')).toHaveLength(1);
      expect(root.querySelectorAll('select')).toHaveLength(1);
      expect(submitButton().disabled).toBe(false);
      http.expectNone(KYC_URL);
    });

    it('un error de conexión NO se muestra como persona inexistente', async () => {
      await fillForm();
      await submit();
      http.expectOne(LOOKUP_URL).error(new ProgressEvent('error'));
      await settle();

      expect(alertKind()).toBe('connection');
      expect(alertText()).toContain('no hay conexión');
      expect(alertText()).toContain('no significa que no estés registrado');
      expect(alertText()).not.toContain('No encontramos a nadie');
      expect(submitButton().disabled).toBe(false);
    });

    it('un 503 NO se muestra como persona inexistente', async () => {
      await fillForm();
      await submit();
      http
        .expectOne(LOOKUP_URL)
        .flush({ error: 'KYC_UNAVAILABLE' }, { status: 503, statusText: 'Service Unavailable' });
      await settle();

      expect(alertKind()).toBe('unavailable');
      expect(alertText()).not.toContain('No encontramos a nadie');
    });

    it('un 404 sin el código PERSON_NOT_FOUND NO se muestra como persona inexistente', async () => {
      await fillForm();
      await submit();
      http
        .expectOne(LOOKUP_URL)
        .flush({ error: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
      await settle();

      expect(alertText()).not.toContain('No encontramos a nadie');
      expect(alertKind()).toBe('unknown');
    });

    it('permite reintentar la consulta después de un error', async () => {
      await fillForm();
      await submit();
      http.expectOne(LOOKUP_URL).error(new ProgressEvent('error'));
      await settle();

      await submit();
      expect(alertText()).toBe('');
      http.expectOne(LOOKUP_URL).flush({ userId: USER_ID });
      await settle();

      expect(root.querySelector('h1')?.textContent).toContain('Encontramos tu registro');
    });
  });

  describe('OTP simulado: modal antes de activar', () => {
    it('«Activar wallet» solicita el código con POST /otp/challenges y abre el modal, sin activar todavía', async () => {
      await reachFoundStep();
      await clickActivate();

      const req = http.expectOne(OTP_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ userId: USER_ID });
      req.flush(CHALLENGE, CREATED);
      await settle();

      const dialog = root.querySelector('dialog')!;
      expect(dialog).not.toBeNull();
      expect(dialog.hasAttribute('open')).toBe(true);
      expect(dialog.getAttribute('aria-labelledby')).toBe('otp-title');
      expect(dialogText()).toContain('Ingresa tu código de verificación');
      http.expectNone(KYC_URL);
    });

    it('indica que el código es simulado y aparece en la consola del servidor Node', async () => {
      await reachFoundStep();
      await reachOtpStep();

      const note = root.querySelector('[data-testid="otp-note"]')?.textContent ?? '';
      expect(note).toContain('Código simulado');
      expect(note).toContain('consola del servidor Node');
      expect(note).toContain('no se envía por SMS ni correo');
      expect(dialogText()).toContain('Vence en 5 minutos');
    });

    it('el campo del código es accesible: etiqueta, teclado numérico y autocompletado de OTP', async () => {
      await reachFoundStep();
      await reachOtpStep();

      expect(root.querySelector('label[for="otp-code"]')?.textContent).toContain(
        'Código de verificación',
      );
      expect(codeInput().getAttribute('inputmode')).toBe('numeric');
      expect(codeInput().getAttribute('autocomplete')).toBe('one-time-code');
      expect(document.activeElement).toBe(codeInput());
    });

    it('muestra carga al pedir el código y evita pedirlo dos veces', async () => {
      await reachFoundStep();
      await clickActivate();

      expect(activateButton().disabled).toBe(true);
      expect(activateButton().textContent).toContain('Enviando código…');
      expect(otherDocumentButton().disabled).toBe(true);

      activateButton().click();
      await settle();
      const requests = http.match(OTP_URL);
      expect(requests).toHaveLength(1);
      requests[0].flush(CHALLENGE, CREATED);
      await settle();
    });

    it('no pide el código más de una vez mientras el modal está abierto', async () => {
      await reachFoundStep();
      await reachOtpStep();

      const component = fixture.componentInstance as unknown as { activate(): Promise<void> };
      await component.activate();
      await settle();

      http.expectNone(OTP_URL);
      expect(root.querySelectorAll('dialog')).toHaveLength(1);
    });

    it('con el código correcto verifica el reto con POST /otp/challenges/{id}/verify', async () => {
      await reachFoundStep();
      await reachOtpStep();
      await enterCode(' 123456 ');

      const req = http.expectOne(VERIFY_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ code: '123456' });
      req.flush({ challengeId: 'otp-1', status: 'VERIFIED' });
      await settle();
      http.expectOne(KYC_URL).flush(kycResponse('ACTIVE'), CREATED);
      await settle();
      http.expectOne(WALLET_URL).flush(walletResponse('ACTIVE'));
      await settle();
    });

    it('exige escribir el código y no consulta nada si está vacío', async () => {
      await reachFoundStep();
      await reachOtpStep();
      dialogSubmit().click();
      await settle();

      expect(dialogText()).toContain('Ingresa el código de verificación.');
      expect(codeInput().getAttribute('aria-invalid')).toBe('true');
      http.expectNone(VERIFY_URL);
    });

    it('un código incorrecto muestra los intentos restantes y permite reintentar', async () => {
      await reachFoundStep();
      await reachOtpStep();
      await enterCode('000000');
      http
        .expectOne(VERIFY_URL)
        .flush(
          { error: 'OTP_INVALID', attemptsRemaining: 2 },
          { status: 422, statusText: 'Unprocessable Entity' },
        );
      await settle();

      expect(dialogText()).toContain('El código no es correcto. Te quedan 2 intentos.');
      expect(dialogSubmit().disabled).toBe(false);
      expect(root.querySelector('dialog')).not.toBeNull();
      http.expectNone(KYC_URL);
    });

    it('al agotar los intentos pide un código nuevo, y reenviar lo permite', async () => {
      await reachFoundStep();
      await reachOtpStep();
      await enterCode('000000');
      http
        .expectOne(VERIFY_URL)
        .flush(
          { error: 'OTP_ATTEMPTS_EXCEEDED' },
          { status: 429, statusText: 'Too Many Requests' },
        );
      await settle();

      expect(dialogText()).toContain('Agotaste los intentos');
      expect(dialogSubmit().disabled).toBe(true);

      const resend = Array.from(root.querySelectorAll<HTMLButtonElement>('dialog button')).find(
        (button) => button.textContent?.includes('Reenviar código'),
      )!;
      resend.click();
      await settle();
      const req = http.expectOne(OTP_URL);
      expect(req.request.body).toEqual({ userId: USER_ID });
      req.flush({ challengeId: 'otp-2', expiresInSeconds: 120 }, CREATED);
      await settle();

      expect(dialogText()).toContain('Generamos un código nuevo');
      expect(dialogText()).toContain('Vence en 2 minutos');
      expect(dialogSubmit().disabled).toBe(false);
      expect(codeInput().value).toBe('');

      await enterCode('654321');
      expect(http.expectOne('http://mock.test/otp/challenges/otp-2/verify').request.body).toEqual({
        code: '654321',
      });
    });

    it('un código vencido pide uno nuevo', async () => {
      await reachFoundStep();
      await reachOtpStep();
      await enterCode();
      http
        .expectOne(VERIFY_URL)
        .flush({ error: 'OTP_EXPIRED' }, { status: 410, statusText: 'Gone' });
      await settle();

      expect(dialogText()).toContain('El código venció');
      expect(dialogSubmit().disabled).toBe(true);
    });

    it('evita verificar dos veces a la vez y muestra carga', async () => {
      await reachFoundStep();
      await reachOtpStep();
      await enterCode();

      expect(dialogSubmit().disabled).toBe(true);
      expect(dialogText()).toContain('Verificando…');
      root.querySelector('dialog form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();

      const requests = http.match(VERIFY_URL);
      expect(requests).toHaveLength(1);
      requests[0].flush({ challengeId: 'otp-1', status: 'VERIFIED' });
      await settle();
      http.expectOne(KYC_URL).flush(kycResponse('ACTIVE'), CREATED);
      await settle();
      http.expectOne(WALLET_URL).flush(walletResponse('ACTIVE'));
      await settle();
    });

    it('un problema de conexión al verificar se informa sin cerrar el modal', async () => {
      await reachFoundStep();
      await reachOtpStep();
      await enterCode();
      http.expectOne(VERIFY_URL).error(new ProgressEvent('error'));
      await settle();

      expect(dialogText()).toContain('No pudimos conectarnos');
      expect(root.querySelector('dialog')).not.toBeNull();
    });

    it('«Cancelar» cierra el modal sin activar y devuelve el foco a «Activar wallet»', async () => {
      await reachFoundStep();
      await reachOtpStep();

      const cancel = root.querySelector<HTMLButtonElement>('dialog .link-button')!;
      cancel.click();
      await settle();

      expect(root.querySelector('dialog')).toBeNull();
      expect(activateButton().disabled).toBe(false);
      expect(document.activeElement).toBe(activateButton());
      http.expectNone(KYC_URL);
    });

    it('Escape también cierra el modal', async () => {
      await reachFoundStep();
      await reachOtpStep();

      root
        .querySelector('dialog')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle();

      expect(root.querySelector('dialog')).toBeNull();
    });

    it('errores al pedir el código se muestran en la confirmación, sin abrir el modal', async () => {
      await reachFoundStep();
      await clickActivate();
      http.expectOne(OTP_URL).error(new ProgressEvent('error'));
      await settle();

      expect(alertText()).toContain('No pudimos conectarnos');
      expect(root.querySelector('dialog')).toBeNull();
      expect(activateButton().disabled).toBe(false);
    });
  });

  describe('activación (happy path)', () => {
    for (const [label, type, number] of [
      ['DNI', 'DNI', DNI_NUMBER],
      ['carné de extranjería', 'CE', CE_NUMBER],
    ]) {
      it(`con ${label}: tras el OTP envía POST /kyc/verifications con userId, tipo, número, otpChallengeId y scenario APPROVED`, async () => {
        await reachFoundStep(type, number);
        await passOtp();

        const req = http.expectOne(KYC_URL);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
          userId: USER_ID,
          documentType: type,
          document: number,
          otpChallengeId: 'otp-1',
          scenario: 'APPROVED',
        });
        expect(JSON.stringify(req.request.body)).not.toContain('TEST');
        req.flush(kycResponse('ACTIVE'), CREATED);
        await settle();
        http.expectOne(WALLET_URL).flush(walletResponse('ACTIVE'));
        await settle();
      });
    }

    it('muestra «Activando…» en el modal y evita activaciones simultáneas', async () => {
      await reachFoundStep();
      await passOtp();

      expect(dialogText()).toContain('Activando…');
      expect(dialogSubmit().disabled).toBe(true);
      expect(root.querySelector<HTMLButtonElement>('dialog .link-button')!.disabled).toBe(true);

      const component = fixture.componentInstance as unknown as {
        onOtpVerified(id: string): Promise<void>;
      };
      await component.onOtpVerified('otp-1');
      await settle();
      expect(http.match(KYC_URL)).toHaveLength(1);
    });

    it('muestra el resultado ACTIVE y el saldo en soles tras consultar la wallet', async () => {
      await reachFoundStep();
      await passOtp();
      await completeActivation('ACTIVE');

      expect(root.querySelector('dialog')).toBeNull();
      expect(root.querySelector('h1')?.textContent).toContain('Tu wallet de prueba está activa');
      expect(root.querySelector('.result')?.getAttribute('data-status')).toBe('ACTIVE');
      expect(root.querySelector('.badge')?.textContent?.trim()).toBe('Activa');
      expect(root.querySelector('[data-testid="balance"]')?.textContent).toMatch(/S\/\s?0\.00/);
      expect(root.querySelector('[data-testid="verification-id"]')?.textContent).toContain('kyc-1');
      expect(root.querySelector('[data-testid="wallet-id"]')?.textContent).toContain('wallet-1');
      expect(root.querySelector('[data-testid="existing-note"]')).toBeNull();
    });

    it('formatea en soles un saldo que no es cero', async () => {
      await reachFoundStep();
      await passOtp();
      await completeActivation('ACTIVE', { available: 12345 });

      expect(root.querySelector('[data-testid="balance"]')?.textContent).toMatch(/S\/\s?123\.45/);
    });

    it('conserva en memoria el id de verificación y el de wallet', async () => {
      await reachFoundStep();
      await passOtp();
      await completeActivation('ACTIVE');

      const session = TestBed.inject(RegistrationSession);
      expect(session.verificationId()).toBe('kyc-1');
      expect(session.walletId()).toBe('wallet-1');
    });

    it('no presenta el resultado como un KYC real', async () => {
      await reachFoundStep();
      await passOtp();
      await completeActivation('ACTIVE');

      const note = root.querySelector('[data-testid="simulation-note"]')?.textContent ?? '';
      expect(note).toContain('Verificación simulada');
      expect(note).toContain('No es una verificación de identidad real');
      expect(text()).not.toContain(USER_ID);
    });

    it('muestra el resultado aunque falle la consulta de saldos', async () => {
      await reachFoundStep();
      await passOtp();
      http.expectOne(KYC_URL).flush(kycResponse('ACTIVE'), CREATED);
      await settle();
      http
        .expectOne(WALLET_URL)
        .flush({ error: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
      await settle();

      expect(root.querySelector('h1')?.textContent).toContain('Tu wallet de prueba está activa');
      expect(root.querySelector('[data-testid="balance"]')?.textContent).toContain(
        'No disponible por ahora',
      );
    });

    it('mantiene los escenarios: pendiente de revisión y rechazada', async () => {
      await reachFoundStep();
      await passOtp();
      await completeActivation('PENDING');
      expect(root.querySelector('h1')?.textContent).toContain('en revisión');
      expect(text()).toContain('Falta la decisión');

      root.querySelector<HTMLButtonElement>('.button-secondary')!.click();
      await settle();
      await reachFoundStep();
      await passOtp();
      await completeActivation('REJECTED');
      expect(root.querySelector('h1')?.textContent).toContain('No pudimos activar tu wallet');
    });
  });

  describe('activación repetida', () => {
    it('200: informa que la persona ya tenía una wallet y muestra la existente', async () => {
      await reachFoundStep();
      await passOtp();
      await completeActivation('ACTIVE', { existing: true });

      expect(root.querySelector('[data-testid="existing-note"]')?.textContent).toContain(
        'ya tenía una wallet de prueba',
      );
      expect(root.querySelector('[data-testid="existing-note"]')?.textContent).toContain(
        'no se creó otra',
      );
      expect(root.querySelector('h1')?.textContent).toContain('Tu wallet de prueba está activa');
      expect(root.querySelector('[data-testid="wallet-id"]')?.textContent).toContain('wallet-1');
    });
  });

  describe('errores de la activación', () => {
    async function activateAndFail(
      respond: (req: ReturnType<HttpTestingController['expectOne']>) => void,
    ) {
      await reachFoundStep();
      await passOtp();
      respond(http.expectOne(KYC_URL));
      await settle();
    }

    it('documento no coincidente (422 DOCUMENT_MISMATCH): cierra el modal, mensaje claro y sigue en la confirmación', async () => {
      await activateAndFail((req) =>
        req.flush(
          { error: 'DOCUMENT_MISMATCH' },
          { status: 422, statusText: 'Unprocessable Entity' },
        ),
      );

      expect(root.querySelector('dialog')).toBeNull();
      expect(alertText()).toContain('El documento no coincide con el registro encontrado');
      expect(alertKind()).toBe('validation');
      expect(root.querySelector('h1')?.textContent).toContain('Encontramos tu registro');
      expect(activateButton().disabled).toBe(false);
      http.expectNone(WALLET_URL);
    });

    it('persona no encontrada al activar (404 PERSON_NOT_FOUND)', async () => {
      await activateAndFail((req) =>
        req.flush({ error: 'PERSON_NOT_FOUND' }, { status: 404, statusText: 'Not Found' }),
      );

      expect(alertText()).toContain('No encontramos a la persona');
      expect(alertKind()).toBe('not-found');
    });

    it('OTP requerido (403 OTP_REQUIRED): se pedirá un código nuevo al reintentar', async () => {
      await activateAndFail((req) =>
        req.flush({ error: 'OTP_REQUIRED' }, { status: 403, statusText: 'Forbidden' }),
      );

      expect(alertText()).toContain('Necesitamos verificar tu código de seguridad');

      await clickActivate();
      expect(http.expectOne(OTP_URL).request.method).toBe('POST');
    });

    it('OTP vencido (410 OTP_EXPIRED): mensaje claro y código nuevo al reintentar', async () => {
      await activateAndFail((req) =>
        req.flush({ error: 'OTP_EXPIRED' }, { status: 410, statusText: 'Gone' }),
      );

      expect(alertText()).toContain('El código de seguridad venció');
      await clickActivate();
      http.expectOne(OTP_URL);
    });

    it('servicio no disponible (503): sin crear cuenta; al reintentar reutiliza el OTP ya verificado', async () => {
      await activateAndFail((req) =>
        req.flush({ error: 'KYC_UNAVAILABLE' }, { status: 503, statusText: 'Service Unavailable' }),
      );

      expect(alertText()).toContain('no está disponible en este momento');
      expect(alertText()).toContain('No se creó tu cuenta');
      expect(activateButton().disabled).toBe(false);
      expect(TestBed.inject(RegistrationSession).verification()).toBeUndefined();
      http.expectNone(WALLET_URL);

      // El servidor no consumió el OTP: se reintenta sin pedir otro código.
      await clickActivate();
      http.expectNone(OTP_URL);
      const retry = http.expectOne(KYC_URL);
      expect(retry.request.body.otpChallengeId).toBe('otp-1');
      retry.flush(kycResponse('ACTIVE'), CREATED);
      await settle();
      http.expectOne(WALLET_URL).flush(walletResponse('ACTIVE'));
      await settle();

      expect(TestBed.inject(RegistrationSession).walletId()).toBe('wallet-1');
    });

    it('problema de conexión al activar', async () => {
      await activateAndFail((req) => req.error(new ProgressEvent('error')));

      expect(alertText()).toContain('No pudimos conectarnos');
      expect(activateButton().disabled).toBe(false);
    });
  });

  describe('navegación entre pasos', () => {
    it('«Usar otro documento» vuelve al formulario conservando lo escrito', async () => {
      await reachFoundStep('CE', CE_NUMBER);

      otherDocumentButton().click();
      await settle();

      expect(root.querySelector('form')).not.toBeNull();
      expect(typeSelect().value).toBe('CE');
      expect(numberInput().value).toBe(CE_NUMBER);
    });

    it('«Nueva verificación» vuelve al formulario vacío', async () => {
      await reachFoundStep();
      await passOtp();
      await completeActivation('ACTIVE');

      root.querySelector<HTMLButtonElement>('.button-secondary')!.click();
      await settle();

      expect(root.querySelector('form')).not.toBeNull();
      expect(typeSelect().value).toBe('');
      expect(numberInput().value).toBe('');
      expect(text()).not.toContain('Ingresa el número de tu documento');
    });
  });
});

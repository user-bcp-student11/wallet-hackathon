import { NETWORK_ERROR, UNKNOWN_ERROR } from '../api/api-error';
import { KycRequestScenario, TEST_DOCUMENT_PREFIX } from '../api/kyc.models';

/** Textos de la app en español (es-PE), centralizados para i18n. */
export const MESSAGES = {
  app: {
    brand: 'Al toque',
    tagline: 'Tu wallet, a tu manera',
    skipToContent: 'Saltar al contenido principal',
    footerCopy: '© Al toque',
    footerConcept: 'Concepto visual',
    footerMotto: 'Simple. Cerca. Contigo.',
    homeLink: 'Al toque, ir al inicio',
  },
  home: {
    eyebrow: 'Tu dinero, a tu manera',
    titleLine1: 'Tu día a día,',
    titleLine2: 'más',
    titleHighlight: 'simple.',
    lead: 'Una nueva forma de mover tu dinero. Rápida, sencilla y pensada para ti.',
    promoEyebrow: 'Tu dinero, más cerca',
    promoTitle: 'Paga y transfiere.',
    promoBody: 'Todo desde un solo lugar.',
    promoQr: 'Pagos con QR',
    promoTransfers: 'Transferencias',
    promoCta: 'Activa tu wallet',
    cardEyebrow: 'Bienvenido a Al toque',
    cardTitle: 'Empieza a tu manera',
    cardBody: 'Tu wallet para acompañarte en cada momento. Comienza creando tu cuenta.',
    noAccountTitle: '¿Aún no tienes una cuenta?',
    noAccountBody: 'Regístrate y da el primer paso para activar tu wallet.',
    register: 'Regístrate',
    activate: 'Ya tengo cuenta: activar mi wallet',
    disclaimer: 'Demostración con verificación simulada. Usa únicamente datos ficticios.',
  },
  steps: {
    label: 'Pasos del registro',
    progress: (current: number, total: number) => `Paso ${current} de ${total}`,
    names: ['Tus datos', 'Verificación', 'Tu wallet'],
    completed: 'completado',
    current: 'paso actual',
    nextLabel: (name: string) => `Siguiente: ${name}`,
    lastStep: 'Último paso',
  },
  registration: {
    back: 'Volver al inicio',
    title: 'Activa tu wallet',
    stepDataIntro: 'Primero, cuéntanos quién eres. Ingresa tu documento para comenzar.',
    stepVerifyIntro: 'Confirma tus datos y elige el resultado que quieres simular para la verificación.',
    documentTypeLabel: 'Tipo de documento',
    documentTypeOption: 'Documento de prueba (TEST)',
    documentTypeHint: 'Por ahora solo se aceptan documentos de prueba.',
    documentLabel: 'Número de documento',
    documentPlaceholder: `${TEST_DOCUMENT_PREFIX}001`,
    documentHint: `Debe empezar con ${TEST_DOCUMENT_PREFIX}, por ejemplo ${TEST_DOCUMENT_PREFIX}001.`,
    scenarioLabel: 'Resultado a simular',
    scenarioHint: 'El proveedor simulado responde según esta opción.',
    summaryTitle: 'Tus datos',
    continue: 'Continuar',
    verify: 'Verificar identidad',
    verifying: 'Verificando tu identidad…',
    editData: 'Cambiar datos',
    retry: 'Reintentar',
    fixData: 'Corregir mis datos',
    disclaimer:
      'Verificación simulada. Usa únicamente datos ficticios: no ingreses tu DNI ni tu carné de extranjería reales.',
  },
  scenarios: {
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
    MANUAL_REVIEW: 'Revisión manual',
    UNAVAILABLE: 'Proveedor no disponible',
  } satisfies Record<KycRequestScenario, string>,
  validation: {
    documentRequired: 'Ingresa el número de documento para continuar.',
    documentPrefix: `El documento debe empezar con ${TEST_DOCUMENT_PREFIX}. Corrígelo para continuar.`,
    documentMaxLength: (max: number) => `El documento no puede tener más de ${max} caracteres. Acórtalo para continuar.`,
  },
  result: {
    activeTitle: 'Tu wallet está activa',
    activeBody: 'Todo listo. Ya puedes hacer pagos de bajo monto con tu wallet.',
    pendingTitle: 'Tu verificación está en revisión',
    pendingBody:
      'Tu identidad necesita una revisión manual. Falta que un analista tome una decisión; cuando lo haga, tu wallet quedará activa o rechazada.',
    rejectedTitle: 'No pudimos activar tu wallet',
    rejectedBody: 'La verificación de identidad fue rechazada. Revisa tus datos e inténtalo de nuevo.',
    verificationId: 'ID de verificación',
    walletId: 'ID de wallet',
    walletStatus: 'Estado de la wallet',
    balance: 'Saldo',
    available: 'Disponible',
    goToPayments: 'Ir a pagos',
    refresh: 'Actualizar estado',
    refreshing: 'Actualizando…',
    tryAgain: 'Intentar de nuevo',
    newRegistration: 'Registrar otra wallet',
    walletUnavailable: 'No pudimos consultar los saldos de tu wallet.',
  },
  payments: {
    back: 'Volver a mi wallet',
    eyebrow: 'Pagos de bajo monto',
    title: 'Paga y transfiere',
    intro: 'Tu wallet está activa. Desde aquí harás tus pagos y transferencias del día a día.',
    available: 'Saldo disponible',
    qr: 'Pagar con QR',
    transfer: 'Transferir',
    soon: 'Próximamente',
    soonHint: 'Los pagos estarán disponibles en la próxima versión.',
  },
  status: {
    ACTIVE: 'Activa',
    PENDING: 'En revisión',
    REJECTED: 'Rechazada',
  },
} as const;

/** Mensajes por código de error del contrato (`{"error": "CODE"}`). */
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_REQUEST: 'Los datos enviados no son válidos. Revisa tu documento y vuelve a intentarlo.',
  KYC_UNAVAILABLE:
    'El servicio de verificación no está disponible en este momento. No se creó ninguna wallet; puedes reintentar.',
  PAYLOAD_TOO_LARGE: 'Los datos enviados son demasiado grandes. Acorta el número de documento.',
  INVALID_MOCK_LATENCY: 'La configuración de latencia simulada no es válida.',
  NOT_FOUND: 'No encontramos la verificación o la wallet solicitada.',
  [NETWORK_ERROR]: 'No pudimos conectarnos. Revisa tu conexión e inténtalo otra vez.',
  [UNKNOWN_ERROR]: 'Ocurrió un error inesperado. Inténtalo otra vez.',
};

/** Errores que se resuelven reintentando la misma solicitud. */
const RETRYABLE_ERRORS = new Set(['KYC_UNAVAILABLE', NETWORK_ERROR, UNKNOWN_ERROR]);

/** Errores que se resuelven corrigiendo los datos del paso 1. */
const DATA_ERRORS = new Set(['INVALID_REQUEST', 'PAYLOAD_TOO_LARGE']);

export function errorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES[UNKNOWN_ERROR];
}

export function isRetryable(code: string): boolean {
  return RETRYABLE_ERRORS.has(code) || !(code in ERROR_MESSAGES);
}

export function isDataError(code: string): boolean {
  return DATA_ERRORS.has(code);
}

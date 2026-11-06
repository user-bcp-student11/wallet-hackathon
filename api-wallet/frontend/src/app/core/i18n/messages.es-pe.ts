import { NETWORK_ERROR, UNKNOWN_ERROR } from '../api/api-error';
import { KycRequestScenario, TEST_DOCUMENT_PREFIX } from '../api/kyc.models';

/** Textos de la app en español (es-PE), centralizados para i18n. */
export const MESSAGES = {
  app: {
    brand: 'Wallet',
    skipToContent: 'Saltar al contenido principal',
  },
  registration: {
    title: 'Crea tu wallet',
    intro:
      'Verificamos tu identidad con un proveedor simulado. Usa un documento de prueba y elige el resultado que quieres simular.',
    documentTypeLabel: 'Tipo de documento',
    documentTypeHint: 'Solo se aceptan documentos de prueba.',
    documentLabel: 'Número de documento',
    documentHint: `Debe empezar con ${TEST_DOCUMENT_PREFIX}, por ejemplo ${TEST_DOCUMENT_PREFIX}001.`,
    scenarioLabel: 'Resultado a simular',
    scenarioHint: 'El proveedor simulado responde según esta opción.',
    submit: 'Crear mi wallet',
    submitting: 'Creando tu wallet…',
    retry: 'Reintentar',
    errorSummaryTitle: 'Revisa los siguientes datos:',
  },
  scenarios: {
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
    MANUAL_REVIEW: 'Revisión manual',
    UNAVAILABLE: 'Proveedor no disponible',
  } satisfies Record<KycRequestScenario, string>,
  validation: {
    documentRequired: 'Ingresa el número de documento.',
    documentPrefix: `El documento debe empezar con ${TEST_DOCUMENT_PREFIX}.`,
    documentMaxLength: (max: number) => `El documento no puede tener más de ${max} caracteres.`,
  },
  result: {
    activeTitle: 'Tu wallet está activa',
    activeBody: 'Ya puedes usar tu wallet.',
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
    refresh: 'Actualizar estado',
    refreshing: 'Actualizando…',
    tryAgain: 'Intentar de nuevo',
    newRegistration: 'Registrar otra wallet',
    walletUnavailable: 'No pudimos consultar los saldos de tu wallet.',
  },
  status: {
    ACTIVE: 'Activa',
    PENDING: 'En revisión',
    REJECTED: 'Rechazada',
  },
} as const;

/** Mensajes por código de error del contrato (`{"error": "CODE"}`). */
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_REQUEST: 'Los datos enviados no son válidos. Revisa el documento y el resultado elegido.',
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

export function errorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES[UNKNOWN_ERROR];
}

export function isRetryable(code: string): boolean {
  return RETRYABLE_ERRORS.has(code) || !(code in ERROR_MESSAGES);
}

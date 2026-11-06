export const MESSAGES = {
  app: {
    title: 'Activa tu wallet',
    loading: 'Consultando el estado de tu registro…',
    retry: 'Reintentar',
  },
  actions: {
    register: 'Registrarme',
    submitting: 'Enviando…',
    refresh: 'Actualizar estado',
    startOver: 'Hacer otro registro',
  },
  fields: {
    documentType: 'Tipo de documento',
    document: 'Documento',
    scenario: 'Escenario de verificación',
  },
  hints: {
    document: 'Documento ficticio que empieza con TEST-',
  },
  documentTypes: {
    TEST: 'Documento de prueba (TEST)',
  },
  scenarios: {
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
    MANUAL_REVIEW: 'Revisión manual',
    UNAVAILABLE: 'Proveedor no disponible',
  },
  validation: {
    documentTypeRequired: 'Elige el tipo de documento.',
    documentRequired: 'Ingresa tu documento.',
    documentPrefix: 'El documento debe empezar con TEST-.',
    documentLength: 'El documento no puede superar los 200 caracteres.',
    scenarioRequired: 'Elige un escenario de verificación.',
  },
  errors: {
    GENERIC: 'No pudimos completar la operación. Inténtalo de nuevo.',
    NETWORK_ERROR: 'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.',
    KYC_UNAVAILABLE: 'El servicio de verificación no está disponible. Inténtalo de nuevo en unos minutos.',
    INVALID_REQUEST: 'Revisa los datos ingresados e inténtalo de nuevo.',
    PAYLOAD_TOO_LARGE: 'Los datos enviados son demasiado grandes. Acórtalos e inténtalo de nuevo.',
    NOT_FOUND: 'No encontramos tu registro. Haz un nuevo registro.',
  },
  result: {
    ACTIVE: {
      title: '¡Tu wallet está activa!',
      description: 'Ya puedes usar tu wallet.',
    },
    PENDING: {
      title: 'Tu registro está en revisión',
      description:
        'Falta una decisión sobre tu verificación para activar tu wallet. Vuelve a consultar el estado más tarde.',
    },
    REJECTED: {
      title: 'No pudimos activar tu wallet',
      description: 'Tu verificación fue rechazada. Puedes hacer un nuevo registro.',
    },
    available: 'Saldo disponible',
    walletStatus: 'Estado de tu wallet',
    walletStatusLabels: {
      ACTIVE: 'Activa',
      PENDING: 'Pendiente',
      REJECTED: 'Rechazada',
    },
  },
} as const;

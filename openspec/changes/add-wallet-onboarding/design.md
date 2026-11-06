# Design

## Context

El repositorio aún no tiene código. Este cambio es el primero que toca el frontend y comparte el backend con `payment-core`. Motivación en `proposal.md`; comportamiento en `specs/`. Restricciones:

- Stack: Java 21, Spring Boot 3.x, Maven, PostgreSQL y Flyway en el backend; Angular mobile-first (PWA) en el frontend. Las versiones exactas se fijan en `docs/architecture/adr/001-stack.md`.
- Monolito modular con arquitectura hexagonal por módulo; este cambio crea `onboarding`, `wallet` y `analytics`.
- Los proveedores externos (OTP y validación de identidad) se sustituyen por fakes configurables detrás de puertos.
- Los requisitos de KYC no están definidos por Cumplimiento. Lo marcado como "Decisión provisional" debe confirmarse antes de producción.

## Goals / Non-Goals

**Goals:**
- Un onboarding cuya secuencia, validación y progreso los controla el servidor.
- Eventos analíticos transaccionales y sin datos personales que permitan calcular las métricas de la épica.
- Idempotencia en el inicio y la confirmación final.

**Non-Goals:**
- KYC real con proveedor externo, vinculación de fuente de fondos, saldo o recarga.
- Autenticación y sesiones posteriores al onboarding.
- Integración con plataformas de marketing; el gasto se registra por una operación.
- Visualización de métricas con tableros; este cambio entrega los cálculos y su consulta.

## Decisions

### D1. Definición de pasos dirigida por el servidor
El servidor entrega la lista de pasos, el paso actual, el progreso, y la instrucción y etiqueta del siguiente paso. El cliente renderiza un stepper genérico y un formulario por tipo de paso. La secuencia vive en configuración (`@ConfigurationProperties`).
Alternativa descartada: pasos codificados en el frontend. Cualquier cambio de KYC exigiría desplegar el cliente y duplicaría la validación.

### D2. Secuencia de pasos de KYC (Decisión provisional)
Secuencia inicial de tres pasos: (1) `phone`: celular y OTP; (2) `identity`: tipo y número de documento (DNI o CE), nombres y fecha de nacimiento, con mayoría de edad; (3) `confirmation`: aceptación de términos y confirmación, que activa la wallet. No se recolecta correo. La define Cumplimiento y requiere confirmación de Producto y Cumplimiento antes de producción; al ser configuración, cambiarla no exige cambios de código. Tres pasos favorecen la meta de 3 min.

### D3. Modelo de estado y persistencia
Agregado `Onboarding` con estados `IN_PROGRESS`, `COMPLETED` y `ABANDONED`, paso actual, última actividad y atribución. Las transiciones usan actualización condicional por estado y `@Version`. Un usuario tiene como máximo un onboarding `IN_PROGRESS`. La wallet (módulo `wallet`) pasa a `ACTIVE` en la misma transacción que `onboarding_completed`. Migraciones Flyway aditivas.

### D4. Frontera de duración (Decisión provisional)
Duración = marca de tiempo del servidor de `onboarding_completed` menos la de `onboarding_started`, mediana sobre completados de la cohorte. Esperas del usuario (por ejemplo, recibir el OTP) cuentan dentro de la duración. Pendiente de confirmación de Producto sobre si el inicio es la apertura de la app o el primer paso.

### D5. Idempotencia con `Idempotency-Key`
El inicio y la confirmación final aceptan `Idempotency-Key`. Se guarda la respuesta por clave y onboarding, y una repetición devuelve la respuesta original. El cliente genera un UUID por intento de envío y lo reutiliza en reintentos. Cuando falta la clave en la confirmación, la propia máquina de estados la hace idempotente: confirmar un onboarding ya completado devuelve la wallet activa.

### D6. Definición de MAU (Decisión provisional)
MAU = usuarios distintos con al menos un `payment_succeeded` (evento de activación de `payment-core`) en el mes calendario de `America/Lima`. `app_opened` se registra como señal complementaria, no entra en el MAU. Pendiente de confirmación de Producto.

### D7. Eventos con outbox y lista blanca
Los eventos se insertan en una tabla outbox dentro de la misma transacción del cambio de estado y un despachador los publica. Un validador con lista blanca de campos rechaza cualquier evento con campos fuera de ella; los logs son estructurados y enmascaran campos sensibles. Alternativa descartada: publicar tras confirmar; puede perder el evento.

### D8. Abandono con job y reloj inyectado
Un proceso periódico marca como `ABANDONED` los onboardings `IN_PROGRESS` sin actividad por más de `ONBOARDING_ABANDON_HOURS` (24 h por defecto) y emite un único `onboarding_abandoned`. El tiempo se obtiene de un `Clock` inyectado para probar sin esperas. Un onboarding abandonado no se reanuda: se inicia uno nuevo. Esto mantiene un único evento de cierre por onboarding y una duración bien definida.

### D9. Adquisición, gasto y CAC
El cliente lee `channel`, `campaign` y `ref` de la URL de entrada y los envía al iniciar; sin parámetros el canal es "directo". El gasto se registra por una operación con mes, canal, campaña y monto en céntimos. El CAC se calcula en `analytics` como gasto total del mes entre nuevos usuarios activos, con resultado no disponible si no hay activaciones, y con desglose por canal y campaña. La agrupación mensual usa `America/Lima`.

### D10. Proveedores simulados
Puertos `OtpProviderPort` e `IdentityValidationPort` con adaptadores fake configurables. El OTP fake usa un código fijo (`OTP_FAKE_CODE`). Una integración real posterior implementa el mismo puerto.

### D11. Contrato y frontend
`docs/architecture/openapi.yaml` es el contrato *contract-first*: errores de validación por campo en formato Problem Details (RFC 9457) y cabecera `Idempotency-Key`. En Angular, componentes standalone con `OnPush`, formularios reactivos tipados, validación local de respuesta inmediata y mapeo de los errores del servidor a cada control, y un interceptor que agrega `Idempotency-Key`.

## Risks / Trade-offs

- [La secuencia de KYC puede cambiar por Cumplimiento] → Es configuración (D1, D2); las validaciones de formato están en reglas aisladas y reutilizables.
- [Mediana medida con esperas de OTP incluidas puede sobreestimar la duración] → Los eventos por paso permiten medir tiempo por paso y reevaluar D4 sin cambiar la captura.
- [MAU depende de `payment_succeeded`, de otro cambio] → Hasta que `payment-core` exista el MAU es cero; las pruebas usan eventos sintéticos.
- [Un onboarding abandonado no reanuda y el usuario repite datos] → Compromiso aceptado para mantener métricas limpias; se reevalúa con los datos de abandono por paso.
- [Eventos con datos personales por error] → Lista blanca con prueba que falla ante campos nuevos no autorizados.
- [Uso de OTP fake en producción] → El fake solo se activa por perfil de configuración y la aplicación no arranca con el fake en el perfil de producción.

## Open Questions

- ¿Cumplimiento exige pasos o documentos adicionales de KYC? Cambia solo la configuración de D2.
- ¿Qué mecanismo de sesión se usa tras el onboarding? Pertenece a un cambio posterior.

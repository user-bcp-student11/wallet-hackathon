# Design

## Context

El repositorio aún no tiene código. Este cambio es el primero que toca el frontend y comparte el backend con `payment-core`. Motivación en `proposal.md`; comportamiento en `specs/`. Restricciones:

- Stack: Java 21, Spring Boot 3.x, Maven, PostgreSQL y Flyway en el backend; Angular mobile-first (PWA) en el frontend. Las versiones exactas se fijan en `docs/architecture/adr/001-stack.md`.
- Monolito modular con arquitectura hexagonal por módulo; este cambio crea `onboarding` y `wallet`.
- Los proveedores externos (OTP y validación de identidad) se sustituyen por fakes configurables detrás de puertos.
- Los requisitos de KYC no están definidos por Cumplimiento. Lo marcado como "Decisión provisional" debe confirmarse antes de producción.

## Goals / Non-Goals

**Goals:**
- Un onboarding cuya secuencia, validación y progreso los controla el servidor.
- Activación de la wallet atómica con el cierre del onboarding.
- Idempotencia en el inicio y la confirmación final.

**Non-Goals:**
- KYC real con proveedor externo, vinculación de fuente de fondos, saldo o recarga.
- Autenticación y sesiones posteriores al onboarding.
- Eventos analíticos, atribución, métricas (mediana, CAC, MAU) y su privacidad en eventos: cambio aparte.

## Decisions

### D1. Definición de pasos dirigida por el servidor
El servidor entrega la lista de pasos, el paso actual, el progreso, y la instrucción y etiqueta del siguiente paso. El cliente renderiza un stepper genérico y un formulario por tipo de paso. La secuencia vive en configuración (`@ConfigurationProperties`).
Alternativa descartada: pasos codificados en el frontend. Cualquier cambio de KYC exigiría desplegar el cliente y duplicaría la validación.

### D2. Secuencia de pasos de KYC (Decisión provisional)
Secuencia inicial de tres pasos: (1) `phone`: celular y OTP; (2) `identity`: tipo y número de documento (DNI o CE), nombres y fecha de nacimiento, con mayoría de edad; (3) `confirmation`: aceptación de términos y confirmación, que activa la wallet. No se recolecta correo. La define Cumplimiento y requiere confirmación de Producto y Cumplimiento antes de producción; al ser configuración, cambiarla no exige cambios de código.

### D3. Modelo de estado y persistencia
Agregado `Onboarding` con estados `IN_PROGRESS`, `COMPLETED` y `ABANDONED`, paso actual y última actividad. Las transiciones usan actualización condicional por estado y `@Version`. Un usuario tiene como máximo un onboarding `IN_PROGRESS`. La wallet (módulo `wallet`) pasa a `ACTIVE` en la misma transacción que completa el onboarding. Migraciones Flyway aditivas.

### D4. Idempotencia con `Idempotency-Key`
El inicio y la confirmación final aceptan `Idempotency-Key`. Se guarda la respuesta por clave y onboarding, y una repetición devuelve la respuesta original. El cliente genera un UUID por intento de envío y lo reutiliza en reintentos. Cuando falta la clave en la confirmación, la propia máquina de estados la hace idempotente: confirmar un onboarding ya completado devuelve la wallet activa.

### D5. Abandono con job y reloj inyectado
Un proceso periódico marca como `ABANDONED` los onboardings `IN_PROGRESS` sin actividad por más de `ONBOARDING_ABANDON_HOURS` (24 h por defecto). El tiempo se obtiene de un `Clock` inyectado para probar sin esperas. Un onboarding abandonado no se reanuda: se inicia uno nuevo.

### D6. Proveedores simulados
Puertos `OtpProviderPort` e `IdentityValidationPort` con adaptadores fake configurables. El OTP fake usa un código fijo (`OTP_FAKE_CODE`). Una integración real posterior implementa el mismo puerto.

### D7. Contrato, frontend y registros
`docs/architecture/openapi.yaml` es el contrato *contract-first*: errores de validación por campo en formato Problem Details (RFC 9457) y cabecera `Idempotency-Key`. En Angular, componentes standalone con `OnPush`, formularios reactivos tipados, validación local de respuesta inmediata y mapeo de los errores del servidor a cada control, y un interceptor que agrega `Idempotency-Key`. Los logs son estructurados y no incluyen datos personales ni valores de formularios.

## Risks / Trade-offs

- [La secuencia de KYC puede cambiar por Cumplimiento] → Es configuración (D1, D2); las validaciones de formato están en reglas aisladas y reutilizables.
- [Un onboarding abandonado no reanuda y el usuario repite datos] → Compromiso aceptado para mantener un único cierre por onboarding.
- [Datos personales en logs por error] → Logs sin valores de formulario y una prueba que falla si aparecen.
- [Uso de OTP fake en producción] → El fake solo se activa por perfil de configuración y la aplicación no arranca con el fake en el perfil de producción.

## Open Questions

- ¿Cumplimiento exige pasos o documentos adicionales de KYC? Cambia solo la configuración de D2.
- ¿Qué mecanismo de sesión se usa tras el onboarding? Pertenece a un cambio posterior.

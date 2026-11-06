# Design

## Context

El repositorio ya tiene el backend de este cambio en `api-wallet/backend`. Este cambio es el primero que toca el frontend y comparte el backend con `payment-core`. Motivación en `proposal.md`; comportamiento en `specs/`. Restricciones:

- Stack: Java 21, Spring Boot 3.x, Maven, PostgreSQL y Flyway en el backend; Angular mobile-first en el frontend. Las versiones exactas se fijan en `api-wallet/docs/architecture/adr/001-stack.md`.
- Monolito modular con arquitectura hexagonal por módulo; este cambio crea `onboarding` (KYC) y `wallet`.
- El contrato HTTP es `backend/src/main/resources/openapi-wallet.yml` (tag "W1 · Registro y activación") y es la fuente de verdad: rutas, códigos de estado y errores salen de él.
- La verificación es simulada: el escenario de la solicitud decide el resultado. No se validan documentos reales.

## Goals / Non-Goals

**Goals:**
- Crear la verificación KYC simulada y su wallet de forma atómica según el escenario.
- Permitir la decisión humana sobre revisiones manuales, con resultado final único aun con decisiones simultáneas.
- Exponer el estado y los saldos de la wallet.

**Non-Goals:**
- KYC real con proveedor externo, vinculación de fuente de fondos, recarga y reservas por pagos (W2).
- Autenticación y sesiones.
- `GET /support/cases` (W5) y el `429` de cloud.
- Eventos analíticos, atribución y métricas: cambio aparte.

## Decisions

### D1. El contrato `openapi-wallet.yml` es la fuente de verdad
Rutas, cuerpos, códigos de estado y códigos de error (`{"error": "CODE"}`) se toman del contrato y de la especificación W1. Donde el contrato no define un código se elige uno estable: `INVALID_REQUEST` para el `400` genérico y `PAYLOAD_TOO_LARGE` para el `413`. El servicio escucha en el puerto 8787.
Alternativa descartada: un contrato propio con Problem Details y cabecera `Idempotency-Key`. Duplicaría la fuente de verdad y no es compatible con quien consume el mock.

### D2. El escenario determina el resultado
`KycScenario` traduce cada escenario al estado resultante: `APPROVED` a `ACTIVE`, `REJECTED` a `REJECTED`, `MANUAL_REVIEW` a `PENDING`; `UNAVAILABLE` no tiene estado y falla con `KYC_UNAVAILABLE`. La solicitud se valida antes de crear nada: `documentType` `TEST` y `document` con prefijo `TEST-`. La creación de wallet, verificación y caso de soporte ocurre en una transacción, de modo que un fallo no deja datos parciales.

### D3. Módulos aislados por puertos
`onboarding` no conoce a `wallet`: crea y cambia el estado de la wallet a través de `WalletProvisioningPort`, cuyo adaptador usa los casos de uso de `wallet`. El caso de soporte pasa por `SupportCasePort`. `wallet` tampoco depende de `onboarding`. Pruebas ArchUnit lo exigen, además de que `domain` no dependa de Spring, de aplicación ni de adaptadores.

### D4. Decisión con resultado final único
`KycVerification.decide` aplica la decisión sobre una verificación `PENDING`, conserva el resultado si se repite la misma y falla con `DECISION_CONFLICT` si contradice una decisión final. La decisión lee la verificación con bloqueo de fila (`SELECT … FOR UPDATE`) dentro de la transacción, de modo que decisiones simultáneas contrarias se serializan. Una prueba de concurrencia falla si se quita el bloqueo.

### D5. Datos del proveedor simulado
`wallet-demo` se precarga por migración `ACTIVE` con 100000 céntimos. Los importes son enteros en céntimos y `available = balance - reserved`; `reserved` vale 0 mientras no existan pagos `PENDING` (W2).

### D6. Latencia simulada y límite de cuerpo en filtros
Dos filtros de servlet, con errores escritos en el formato del contrato: `MockLatencyFilter` aplica `X-Mock-Latency-Ms` o `latency` (0 a 5000 ms, el header gana, ambos deben ser válidos) y devuelve `INVALID_MOCK_LATENCY` antes de ejecutar la operación; `BodySizeLimitFilter` rechaza con `413` los cuerpos declarados mayores a 65536 bytes.

### D7. Registros sin datos del documento
Los logs son estructurados y no incluyen el documento enviado. Un conversor de logback enmascara fechas y números largos como red de seguridad, y una prueba falla si el documento aparece en los registros.

## Risks / Trade-offs

- [Los códigos `INVALID_REQUEST` y `PAYLOAD_TOO_LARGE` no están definidos por el contrato] → Son elecciones de este cambio; confirmarlas con quien consume el mock.
- [El `413` solo evalúa el `Content-Length` declarado] → Basta para los JSON pequeños del contrato; un cuerpo por *chunks* no se corta en el filtro.
- [Las altas repetidas crean wallets duplicadas] → Comportamiento exigido por el contrato ("No evita altas repetidas").
- [El frontend sigue el flujo anterior y no funciona contra este backend] → Realineación pendiente (sección 5 de `tasks.md`).

## Open Questions

- ¿Debe `GET /support/cases` (W5) exponerse en este cambio? Hoy solo se guarda el caso al abrirlo y resolverlo.
- ¿Los códigos `INVALID_REQUEST` y `PAYLOAD_TOO_LARGE` coinciden con los que espera quien consume el mock?

# Tasks

## 1. Fundamentos y contrato

- [x] 1.1 Registrar en `api-wallet/docs/architecture/adr/001-stack.md` las versiones exactas de Java, Spring Boot, Angular, PostgreSQL y herramientas de test, y verificar que el documento existe y lista cada versión
- [x] 1.2 Crear (o reutilizar si `payment-core` ya lo creó) el proyecto `api-wallet/backend/` con módulos `onboarding` y `wallet` en arquitectura hexagonal, y verificar que `./mvnw verify` compila y pasa
- [x] 1.3 Agregar las pruebas ArchUnit que impiden que `domain` dependa de Spring, de aplicación o de adaptadores y que aíslan `onboarding` y `wallet` entre sí, y verificar que pasan
- [x] 1.4 Crear el proyecto `api-wallet/frontend/` Angular con `core/` y `shared/`, y verificar que `ng build` y `ng test` terminan sin errores
- [x] 1.5 Adoptar `backend/src/main/resources/openapi-wallet.yml` (tag "W1 · Registro y activación") como contrato fuente de verdad, servir el backend en el puerto 8787 y retirar el contrato propio `docs/architecture/openapi.yaml`, y verificar que cada operación de `kyc` y `wallets` responde según el contrato con pruebas MockMvc

## 2. Dominio y casos de uso KYC

- [x] 2.1 Implementar las reglas de la solicitud (`documentType` `TEST`, `document` con prefijo `TEST-`, `scenario` predeterminado `APPROVED`) y el estado resultante por escenario, y verificar con pruebas de "Escenario aprobado", "Escenario omitido", "Escenario rechazado", "Revisión manual", "Proveedor no disponible" y "Entrada inválida"
- [x] 2.2 Implementar la decisión sobre una verificación (`PENDING` a final, repetición y conflicto), y verificar con pruebas de "Decisión de activación", "Decisión de rechazo", "Decisión repetida", "Cambio de una decisión final" y "Decisión inválida"
- [x] 2.3 Definir los puertos `WalletProvisioningPort`, `SupportCasePort` y `KycVerificationRepositoryPort` con sus casos de uso, y verificar con pruebas unitarias con fakes de "Altas repetidas", "Verificación existente" y "Verificación inexistente"

## 3. Persistencia y API

- [x] 3.1 Crear las migraciones Flyway de wallets (con `wallet-demo`), verificaciones KYC y casos de soporte, y verificar que se aplican limpias sobre PostgreSQL con Testcontainers y que `wallet-demo` queda `ACTIVE` con 100000
- [x] 3.2 Leer la verificación con bloqueo de fila en la decisión, y verificar con una prueba de concurrencia de "Decisiones simultáneas contrarias" que falla si se quita el bloqueo
- [x] 3.3 Exponer `POST /kyc/verifications`, `GET /kyc/verifications/{id}` y `POST /kyc/verifications/{id}/decision` con errores `{"error": "CODE"}`, y verificar con pruebas MockMvc de cada escenario de creación, consulta y decisión de `wallet-onboarding`
- [x] 3.4 Implementar la latencia simulada (`X-Mock-Latency-Ms` y `latency`) y el límite de 65536 bytes, y verificar con pruebas de "Latencia válida", "Latencia inválida" y "Cuerpo demasiado grande"
- [x] 3.5 Implementar el enmascarado de logs y una prueba de privacidad que falle si un log contiene el documento, y verificar con "Registro de solicitudes con documento"

## 4. Wallet

- [x] 4.1 Implementar `GET /wallets/{id}` con `available = balance - reserved` y `currency` `PEN`, y verificar con pruebas de "Wallet precargada", "Saldo disponible" y "Wallet inexistente"

## 5. Frontend (pendiente)

El frontend existente sigue el flujo anterior (pasos, OTP, `Idempotency-Key`, `X-User-Id`) y no funciona contra este backend. Estas tareas lo realinean al contrato.

- [x] 5.1 Realinear el cliente HTTP al contrato `openapi-wallet.yml` (`/kyc/verifications`, `/kyc/verifications/{id}`, `/wallets/{id}`), retirando el flujo por pasos, `Idempotency-Key` y `X-User-Id` y apuntando el proxy al puerto 8787, y verificar con pruebas unitarias del cliente
- [x] 5.2 Implementar el formulario de registro (`documentType` `TEST`, `document`, `scenario`) con validación local y mapeo de los errores `{"error": "CODE"}` a mensajes en español, y verificar con pruebas de "Entrada inválida" y "Proveedor no disponible"
- [x] 5.3 Mostrar el resultado del registro según el estado: `ACTIVE`, `PENDING` (explicar que falta una decisión) y `REJECTED`, consultando la verificación y la wallet, y verificar con pruebas de "Escenario aprobado", "Revisión manual" y "Escenario rechazado"
- [x] 5.4 Conservar la accesibilidad (etiquetas, `aria-describedby`, foco al primer error, objetivos táctiles de al menos 44 px) y los textos es-PE centralizados, y verificar con pruebas de componente de foco y de mensajes
- [x] 5.5 Realinear el E2E con Playwright en viewport móvil al registro y a un error recuperable, y verificar que pasa en verde

## 6. Verificación integral

- [x] 6.1 Elaborar `api-wallet/docs/qa/add-wallet-onboarding-trazabilidad.md` con una fila por comportamiento del contrato y su test, y verificar que todos están en estado cubierto y en verde
- [x] 6.2 Ejecutar `./mvnw clean verify` y verificar que termina sin errores
- [x] 6.3 Ejecutar `ng test`, `ng build`, `npx playwright test` y `openspec validate add-wallet-onboarding --strict` tras realinear el frontend, y verificar que terminan sin errores

## Workflow follow-up

- Confirmar con quien consume el mock los códigos `INVALID_REQUEST` y `PAYLOAD_TOO_LARGE`, que el contrato no define.
- Archivar el cambio cuando el Product Owner acepte la entrega y el frontend esté realineado.

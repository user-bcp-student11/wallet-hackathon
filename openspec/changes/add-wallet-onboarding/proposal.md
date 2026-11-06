# Proposal

## Why

La historia W1 ([Registro y activación del MVP de wallet](../../../resources/user-stories/w1-user-onboarding-mvp-completion.sp.md)) es la puerta de entrada de la épica ([MVP de wallet en Perú](../../../resources/epic/peru-wallet-mvp.sp.md)): sin un registro rápido no hay wallets activas que paguen. Este cambio construye esa funcionalidad sobre el contrato `backend/src/main/resources/openapi-wallet.yml` (tag "W1 · Registro y activación"), que es la fuente de verdad.

## What Changes

- Creación de una verificación KYC simulada y de su wallet con saldo cero (`POST /kyc/verifications`), según el escenario: `APPROVED` (activa, predeterminado), `REJECTED`, `MANUAL_REVIEW` (queda `PENDING` y abre un caso de soporte) y `UNAVAILABLE` (503 sin crear wallet).
- Consulta de la verificación (`GET /kyc/verifications/{id}`) y decisión humana `ACTIVE` o `REJECTED` sobre una verificación en revisión (`POST /kyc/verifications/{id}/decision`), con repetición idempotente y conflicto al cambiar una decisión final.
- Consulta del estado y saldos de la wallet (`GET /wallets/{id}`), con `wallet-demo` precargada.
- Latencia simulada por solicitud, límite de 65536 bytes en el cuerpo y errores con código estable `{"error": "..."}`.
- Pantallas Angular mobile-first del registro y del resultado: **pendiente**. El frontend existente sigue el flujo anterior y debe realinearse a este contrato.
- Fuera de alcance: pagos (W2 y `payment-core`), `GET /support/cases` (W5), `429` (solo cloud), KYC real con proveedor externo, vinculación de fuente de fondos, recarga, onboarding de comercios, autenticación y toda la instrumentación analítica (eventos, atribución, mediana de duración, CAC y MAU), que se tratará en un cambio aparte.

## Capabilities

### New Capabilities

- `wallet-onboarding`: verificación KYC simulada, creación de la wallet, decisión sobre revisiones manuales, consulta de verificación y de wallet, latencia simulada y límite de cuerpo.

### Modified Capabilities

<!-- Ninguna: no hay specs previas. `payment-core` es un cambio paralelo sin capacidades compartidas. -->

## Impact

- Código: módulos `onboarding` y `wallet` en `api-wallet/backend/` y feature de registro en `api-wallet/frontend/` (pendiente), con migraciones de base de datos y el contrato `openapi-wallet.yml`.
- Proveedor KYC: simulado por el escenario de la solicitud; no hay integración externa.
- Valores del contrato: servicio en el puerto 8787, `wallet-demo` con 100000 céntimos.

# Proposal

## Why

La historia W1 ([Registro y activación del MVP de wallet](../../../resources/user-stories/w1-user-onboarding-mvp-completion.sp.md)) es la puerta de entrada de la épica ([MVP de wallet en Perú](../../../resources/epic/peru-wallet-mvp.sp.md)): sin un onboarding guiado y rápido no hay wallets activas que paguen. Este cambio construye esa funcionalidad.

## What Changes

- Flujo de onboarding guiado por el servidor: secuencia de pasos configurable, paso actual siempre visible, instrucción del siguiente paso y bloqueo del avance con mensajes accionables por campo.
- Validaciones de Perú en servidor (celular, DNI, CE, mayoría de edad) y verificación de celular por OTP mediante un proveedor simulado.
- Activación de la wallet al finalizar el onboarding, con confirmación idempotente, y habilitación del punto de entrada de pagos de bajo monto.
- Abandono del onboarding por inactividad configurable.
- Pantallas Angular mobile-first del onboarding, construidas a partir de la definición de pasos del servidor.
- Fuera de alcance: pagos (W2 y `payment-core`), KYC real con proveedor externo, vinculación de fuente de fondos, saldo y recarga, onboarding de comercios, autenticación posterior al onboarding, y toda la instrumentación analítica (eventos, atribución, mediana de duración, CAC y MAU), que se tratará en un cambio aparte.

## Capabilities

### New Capabilities

- `wallet-onboarding`: pasos definidos por el servidor, progreso visible, validación de datos y bloqueo accionable, abandono, activación de la wallet con confirmación idempotente y acceso al punto de entrada de pagos.

### Modified Capabilities

<!-- Ninguna: no hay specs previas. `payment-core` es un cambio paralelo sin capacidades compartidas. -->

## Impact

- Código: módulos `onboarding` y `wallet` en `backend/` y feature `onboarding` en `frontend/`, con migraciones de base de datos y contrato `docs/architecture/openapi.yaml`.
- Proveedores simulados: OTP y validación de identidad, como puertos con fakes configurables.
- Decisión provisional que requiere confirmación: D2 (secuencia de pasos de KYC, con Cumplimiento). Valor configurable por defecto: abandono tras 24 h.

# Proposal

## Why

La historia W1 ([Registro y activación del MVP de wallet](../../../resources/user-stories/w1-user-onboarding-mvp-completion.sp.md)) es la puerta de entrada de la épica ([MVP de wallet en Perú](../../../resources/epic/peru-wallet-mvp.sp.md)): sin un onboarding guiado y rápido no hay wallets activas que paguen. Además produce la instrumentación de la que dependen las metas de la épica de onboarding (8 a 3 min), MAU (1,000 a 2,000) y CAC (PEN 10).

## What Changes

- Flujo de onboarding guiado por el servidor: secuencia de pasos configurable, paso actual siempre visible, instrucción del siguiente paso y bloqueo del avance con mensajes accionables por campo.
- Validaciones de Perú en servidor (celular, DNI, CE, mayoría de edad) y verificación de celular por OTP mediante un proveedor simulado.
- Activación de la wallet al finalizar el onboarding, con confirmación idempotente, y habilitación del punto de entrada de pagos de bajo monto.
- Abandono del onboarding por inactividad configurable.
- Eventos analíticos de onboarding (inicio, fin de cada paso, cierre) y de apertura de la app, con lista blanca de campos sin datos personales.
- Métricas derivadas de esos eventos: mediana de duración del onboarding, nuevos usuarios activos por mes, atribución de adquisición, gasto de adquisición, CAC y MAU frente a sus umbrales.
- Pantallas Angular mobile-first del onboarding, construidas a partir de la definición de pasos del servidor.
- Fuera de alcance: pagos (W2 y `payment-core`), KYC real con proveedor externo, vinculación de fuente de fondos, saldo y recarga, onboarding de comercios, autenticación posterior al onboarding y herramientas de marketing para el gasto (el gasto se registra por una operación, no se integra con plataformas).

Metas medidas después del lanzamiento, no verificables en código: mediana de 3 min, MAU entre 1,000 y 2,000 y CAC de PEN 10. Lo verificable en código es que la instrumentación y los cálculos producen esos números correctamente.

## Capabilities

### New Capabilities

- `onboarding-flow`: pasos definidos por el servidor, progreso visible, validación de datos y bloqueo accionable, reanudación y abandono.
- `wallet-activation`: activación de la wallet al completar el onboarding, confirmación idempotente y acceso al punto de entrada de pagos.
- `onboarding-analytics`: eventos de onboarding y de apertura de la app, privacidad de los datos, mediana de duración, nuevos usuarios activos por mes, atribución, CAC y MAU.

### Modified Capabilities

<!-- Ninguna: no hay specs previas. `payment-core` es un cambio paralelo sin capacidades compartidas. -->

## Impact

- Código: módulos `onboarding`, `wallet` y `analytics` en `backend/` y feature `onboarding` en `frontend/`, con migraciones de base de datos y contrato `docs/architecture/openapi.yaml`.
- Proveedores simulados: OTP y validación de identidad, como puertos con fakes configurables.
- Dependencia con `payment-core`: el evento `payment_succeeded` alimenta la definición provisional de MAU.
- Decisiones provisionales que requieren confirmación: D2 (secuencia de pasos de KYC, con Cumplimiento), D4 (frontera de duración) y D6 (definición de MAU). Valores configurables por defecto: abandono tras 24 h.

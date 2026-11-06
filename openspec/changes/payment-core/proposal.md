# Proposal

## Why

La épica del MVP de wallet en Perú depende de un núcleo de pagos confiable: estados de pago claros, resultados terminales únicos, protección contra duplicidad financiera y trazabilidad para conciliación. Las historias W2 (pago de bajo monto), W3 (estado QR para comercios), W4 (fallas y reversos), W5 (idempotencia) y W6 (conciliación) comparten ese núcleo, y hoy no existe ningún componente que lo defina. Construirlo primero evita que cada historia resuelva por su cuenta estados, reintentos y eventos.

## What Changes

- Introducir el ciclo de vida de un intento de pago con estados `PENDING`, `SUCCEEDED`, `FAILED` y `EXPIRED`, un único resultado terminal por intento y una referencia de transacción persistida.
- Introducir idempotencia con clave derivada de pagador, monto, destino y ventana de intento; los duplicados devuelven el resultado original y quedan registrados con identificadores de solicitud y correlación.
- Introducir un puerto de proveedor de pagos (inicio de pago y recepción de resultados asíncronos) con un adaptador simulado configurable. El MVP no depende de un proveedor real.
- Introducir el registro interno de transacciones (ledger de intentos y resultados, sin saldo propio de wallet), que distingue intentos originales, reintentos y duplicados.
- Introducir la emisión de eventos de pago para analítica (inicio de pago, éxito como evento de activación para MAU, fallo, expiración, duplicado detectado).
- Fuera de alcance de este cambio: pantalla de confirmación del pagador y reglas de monto bajo (W2), vista de comercio QR (W3), rutas de soporte y disputas (W4), reportes de conciliación (W6), onboarding (W1), saldo, recarga y retiro, y reversos o disputas como estados.

## Capabilities

### New Capabilities

- `payment-lifecycle`: intento de pago, máquina de estados, resultado terminal único, expiración, referencia de transacción y registro interno de transacciones consultable.
- `payment-idempotency`: clave de idempotencia derivada, protección contra duplicados dentro de la ventana, liberación de la clave en `FAILED` y `EXPIRED`, y registro auditable de duplicados.
- `payment-provider-gateway`: puerto de proveedor (iniciar pago, recibir resultado asíncrono) y adaptador simulado configurable para pruebas y demo.
- `payment-events`: eventos de pago emitidos en cada transición relevante, incluido el evento de activación del pagador.

### Modified Capabilities

<!-- Ninguna: el proyecto no tiene specs previas. -->

## Impact

- Código: nuevo núcleo de pagos (dominio, casos de uso, puertos y adaptadores). No hay código previo en el repositorio.
- Dependencias: ningún proveedor real; el adaptador simulado reemplaza la integración contractual hasta que exista una.
- Cambios posteriores que se apoyan en este: W2, W3, W4, W6 y el onboarding.
- Supuestos que se registran como configurables y se confirman con producto y operaciones: ventana de intento (5 min), tiempo de expiración de `PENDING` (5 min) y retención de registros de idempotencia (24 h).
- Pila tecnológica sin definir en los documentos; el diseño queda agnóstico y propone una arquitectura de puertos y adaptadores.

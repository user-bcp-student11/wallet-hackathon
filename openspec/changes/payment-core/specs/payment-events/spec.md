# Spec Delta

## Purpose

Emite eventos de pago consistentes en cada transición relevante, para alimentar la analítica del MVP: embudo de checkout, activación de usuarios para MAU y trazabilidad operativa.

## ADDED Requirements

### Requirement: Eventos por transición de pago
El sistema SHALL emitir un evento por cada hecho relevante del pago: `payment_initiated` al crear un intento, `payment_succeeded`, `payment_failed` y `payment_expired` al llegar a cada estado terminal, y `payment_duplicate_detected` al detectar una solicitud duplicada.

#### Scenario: Pago exitoso
- **WHEN** un intento se crea y luego llega a `SUCCEEDED`
- **THEN** se emiten `payment_initiated` y `payment_succeeded`, en ese orden

#### Scenario: Pago que expira
- **WHEN** un intento se crea y luego llega a `EXPIRED`
- **THEN** se emiten `payment_initiated` y `payment_expired`

#### Scenario: Solicitud duplicada
- **WHEN** se detecta una solicitud duplicada
- **THEN** se emite `payment_duplicate_detected` y no se emite `payment_initiated`

### Requirement: Un evento terminal por intento
El sistema SHALL emitir como máximo un evento terminal por intento, aun cuando el proveedor repita o contradiga resultados.

#### Scenario: Callback contradictorio
- **WHEN** llega un resultado contradictorio para un intento ya terminal
- **THEN** no se emite un segundo evento terminal

### Requirement: Evento de activación del pagador
El sistema SHALL identificar `payment_succeeded` como el evento de activación del pagador, de modo que pueda contarse a los usuarios activos mensuales.

#### Scenario: Activación por pago exitoso
- **WHEN** un pagador completa un pago exitoso
- **THEN** el evento `payment_succeeded` incluye el identificador del pagador y la marca de tiempo del éxito

### Requirement: Contenido mínimo de los eventos
El sistema SHALL incluir en cada evento de pago el identificador del pagador, la referencia de transacción, el identificador de correlación, el monto, el estado resultante y la marca de tiempo. Los eventos de fallo SHALL incluir además el código de motivo.

#### Scenario: Evento de fallo
- **WHEN** se emite `payment_failed`
- **THEN** incluye el código de motivo legible por máquina además del contenido mínimo

### Requirement: Entrega de eventos desacoplada del pago
El sistema SHALL NOT alterar el resultado de un pago por un fallo en la emisión de eventos.

#### Scenario: Falla la emisión
- **WHEN** falla la emisión de un evento
- **THEN** el estado del intento permanece correcto y la emisión fallida queda registrada

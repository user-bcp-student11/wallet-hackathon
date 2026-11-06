# Spec Delta

## Purpose

Define el contrato entre el núcleo de pagos y cualquier proveedor externo (iniciar un pago y recibir resultados asíncronos) y un proveedor simulado configurable que permite construir y probar el flujo completo sin contratos reales.

## ADDED Requirements

### Requirement: Contrato de proveedor de pagos
El sistema SHALL interactuar con proveedores externos únicamente mediante un contrato que permita iniciar un pago, enviando la clave de idempotencia, y recibir de forma asíncrona el resultado del pago. El núcleo de pagos SHALL NOT depender de un proveedor concreto.

#### Scenario: Inicio de pago
- **WHEN** se crea un intento de pago
- **THEN** el sistema solicita el pago al proveedor incluyendo la clave de idempotencia y la referencia de transacción

#### Scenario: Proveedor intercambiable
- **WHEN** se sustituye el proveedor simulado por otro que cumpla el contrato
- **THEN** el comportamiento del ciclo de vida del pago no cambia

### Requirement: Recepción de resultados asíncronos
El sistema SHALL aceptar resultados del proveedor en cualquier momento posterior al inicio del pago y aplicarlos al intento correspondiente identificado por su referencia de transacción.

#### Scenario: Resultado exitoso
- **WHEN** el proveedor informa éxito para un intento en `PENDING`
- **THEN** el intento pasa a `SUCCEEDED`

#### Scenario: Resultado fallido
- **WHEN** el proveedor informa fallo para un intento en `PENDING`
- **THEN** el intento pasa a `FAILED` y se guarda un código de motivo legible por máquina

#### Scenario: Referencia desconocida
- **WHEN** el proveedor informa un resultado para una referencia que no existe
- **THEN** el sistema rechaza el resultado y lo registra para revisión sin crear ningún intento

### Requirement: Resultados duplicados del proveedor
El sistema SHALL tolerar que el proveedor repita un mismo resultado sin duplicar efectos ni eventos.

#### Scenario: Callback repetido
- **WHEN** el proveedor envía dos veces el mismo resultado para un intento
- **THEN** el estado del intento y los eventos emitidos son los mismos que con un solo envío

### Requirement: Proveedor simulado configurable
El sistema SHALL incluir un proveedor simulado cuyo comportamiento sea configurable para reproducir al menos: pago exitoso, pago fallido con código de motivo, ausencia de respuesta, respuesta con retraso, resultado repetido y resultado contradictorio posterior a un resultado terminal.

#### Scenario: Escenario de fallo configurado
- **WHEN** el proveedor simulado se configura para fallar con un código de motivo
- **THEN** el intento llega a `FAILED` con ese código de motivo

#### Scenario: Escenario de silencio configurado
- **WHEN** el proveedor simulado se configura para no responder
- **THEN** el intento llega a `EXPIRED` al vencer el tiempo de espera

#### Scenario: Resultado contradictorio configurado
- **WHEN** el proveedor simulado informa éxito después de que el intento ya expiró
- **THEN** el intento permanece en `EXPIRED` y el resultado se registra como discrepancia

### Requirement: Fallo de comunicación con el proveedor
El sistema SHALL NOT dejar un intento sin resolución cuando falla la comunicación al iniciar un pago.

#### Scenario: Proveedor rechaza al iniciar
- **WHEN** el proveedor rechaza o no puede recibir la solicitud al iniciar el pago
- **THEN** el intento pasa a `FAILED` con un código de motivo que identifica el rechazo

#### Scenario: Proveedor sin respuesta al iniciar
- **WHEN** el proveedor no responde a la solicitud de inicio
- **THEN** el intento permanece en `PENDING` hasta vencer el tiempo de espera y pasa a `EXPIRED`

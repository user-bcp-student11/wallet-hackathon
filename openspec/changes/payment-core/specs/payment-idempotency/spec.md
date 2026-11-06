# Spec Delta

## Purpose

Garantiza que reintentos y solicitudes repetidas de un mismo pago no generen duplicidad financiera, devolviendo el resultado original y dejando evidencia auditable de cada duplicado.

## ADDED Requirements

### Requirement: Clave de idempotencia derivada
El sistema SHALL derivar la clave de idempotencia de cada solicitud de pago a partir del pagador, el monto, el destino y la ventana de intento. La ventana es configurable y su valor por defecto es de 5 minutos contados desde la primera solicitud.

#### Scenario: Mismos datos, misma ventana
- **WHEN** llegan dos solicitudes con el mismo pagador, monto y destino dentro de la ventana de intento
- **THEN** ambas producen la misma clave de idempotencia

#### Scenario: Datos distintos
- **WHEN** dos solicitudes difieren en pagador, monto o destino
- **THEN** producen claves de idempotencia distintas

### Requirement: Resultado original para solicitudes repetidas
El sistema SHALL devolver el resultado del intento original, sin crear una nueva transacción financiera, cuando recibe una solicitud con una clave de idempotencia activa cuyo intento está en `PENDING` o `SUCCEEDED`.

#### Scenario: Repetición con el intento pendiente
- **WHEN** se repite una solicitud mientras el intento original está en `PENDING`
- **THEN** el sistema devuelve la referencia y el estado del intento original
- **AND** no se envía una nueva solicitud al proveedor

#### Scenario: Repetición tras un pago exitoso
- **WHEN** se repite una solicitud dentro de la ventana y el intento original está en `SUCCEEDED`
- **THEN** el sistema devuelve el resultado exitoso original
- **AND** no se crea una nueva transacción financiera

### Requirement: Liberación de la clave en resultados no exitosos
El sistema SHALL liberar la clave de idempotencia cuando el intento original llega a `FAILED` o `EXPIRED`, de modo que una nueva solicitud con los mismos datos cree un intento nuevo.

#### Scenario: Reintento tras fallo
- **WHEN** el intento original está en `FAILED` y se envía otra solicitud con los mismos datos dentro de la ventana
- **THEN** el sistema crea un intento nuevo
- **AND** el nuevo intento queda marcado como reintento y enlazado al intento fallido

#### Scenario: Reintento tras expiración
- **WHEN** el intento original está en `EXPIRED` y se envía otra solicitud con los mismos datos
- **THEN** el sistema crea un intento nuevo enlazado al intento expirado

### Requirement: Registro auditable de duplicados
El sistema SHALL registrar cada solicitud duplicada detectada con su identificador de solicitud, su identificador de correlación, la clave de idempotencia y la referencia del intento original.

#### Scenario: Duplicado detectado
- **WHEN** el sistema detecta una solicitud duplicada
- **THEN** guarda un registro de duplicado con identificador de solicitud, identificador de correlación y referencia del intento original
- **AND** el registro de transacciones distingue ese duplicado del intento original

### Requirement: Retención de registros de idempotencia
El sistema SHALL conservar los registros de idempotencia y de duplicados durante un periodo configurable. El valor por defecto es de 24 horas.

#### Scenario: Consulta dentro del periodo de retención
- **WHEN** se consulta un registro de duplicado dentro del periodo de retención
- **THEN** el registro está disponible con todos sus identificadores

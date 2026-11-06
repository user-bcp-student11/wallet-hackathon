# Spec Delta

## Purpose

Define el ciclo de vida de un intento de pago, sus estados, el resultado terminal único, la expiración y el registro interno de transacciones que sirve como fuente de verdad para historial, estado y conciliación.

## ADDED Requirements

### Requirement: Estados de un intento de pago
El sistema SHALL representar cada intento de pago con exactamente uno de los estados `PENDING`, `SUCCEEDED`, `FAILED` o `EXPIRED`. `SUCCEEDED`, `FAILED` y `EXPIRED` son terminales; `PENDING` es el único estado inicial y no terminal.

#### Scenario: Intento recién creado
- **WHEN** se crea un intento de pago válido
- **THEN** el intento queda en estado `PENDING` con una referencia de transacción única

#### Scenario: Transiciones permitidas
- **WHEN** un intento en `PENDING` recibe un resultado exitoso, un resultado fallido o vence su tiempo de espera
- **THEN** pasa respectivamente a `SUCCEEDED`, `FAILED` o `EXPIRED`

### Requirement: Resultado terminal único por intento
El sistema SHALL asignar a cada intento un único resultado terminal. Una vez terminal, el estado de un intento no puede cambiar.

#### Scenario: Resultado contradictorio posterior
- **WHEN** un intento ya está en un estado terminal y llega un resultado del proveedor distinto al registrado
- **THEN** el estado del intento no cambia
- **AND** el resultado recibido se registra como discrepancia asociada a la referencia de transacción para su revisión posterior

#### Scenario: Resultado repetido
- **WHEN** llega un resultado del proveedor idéntico al ya registrado para un intento terminal
- **THEN** el estado no cambia y no se emiten eventos nuevos

### Requirement: Expiración de intentos pendientes
El sistema SHALL mover a `EXPIRED` todo intento que permanezca en `PENDING` más allá de un tiempo de espera configurable. El valor por defecto es de 5 minutos.

#### Scenario: Sin respuesta del proveedor
- **WHEN** transcurre el tiempo de espera configurado sin que el proveedor informe un resultado
- **THEN** el intento pasa a `EXPIRED`

#### Scenario: Resultado dentro del plazo
- **WHEN** el proveedor informa un resultado antes de que venza el tiempo de espera
- **THEN** el intento adopta ese resultado y no expira

### Requirement: Referencia de transacción persistida
El sistema SHALL asignar a cada intento una referencia de transacción única y persistirla junto con pagador, destino, monto, estado, y marcas de tiempo de creación y resolución.

#### Scenario: Consulta por referencia
- **WHEN** se consulta un intento por su referencia de transacción
- **THEN** se devuelve su estado actual y sus datos de pago

#### Scenario: Referencia inexistente
- **WHEN** se consulta una referencia que no existe
- **THEN** el sistema responde que no se encontró la transacción

### Requirement: Registro interno de transacciones
El sistema SHALL mantener un registro interno de todos los intentos de pago con su historial de transiciones de estado. El sistema SHALL NOT mantener saldo de wallet.

#### Scenario: Historial de transiciones
- **WHEN** un intento cambia de estado
- **THEN** el registro conserva el estado anterior, el nuevo estado y el momento del cambio

#### Scenario: Distinción de origen del intento
- **WHEN** se consulta el registro de un intento
- **THEN** el registro indica si es un intento original o un reintento posterior a un `FAILED` o `EXPIRED`, y en ese caso referencia al intento previo

### Requirement: Validación de la solicitud de pago
El sistema SHALL rechazar la creación de un intento cuando falten pagador, destino o monto, o cuando el monto no sea un valor positivo, sin crear un registro de transacción.

#### Scenario: Monto inválido
- **WHEN** se solicita un pago con monto cero o negativo
- **THEN** el sistema rechaza la solicitud con un error de validación
- **AND** no crea ningún intento

# Spec Delta

## Purpose

Simula la verificación de identidad (KYC) y crea la wallet del usuario, de modo que el registro distinga una cuenta activa, una pendiente de revisión y una rechazada. El contrato HTTP es `backend/src/main/resources/openapi-wallet.yml` (tag "W1 · Registro y activación"), que es la fuente de verdad. Los importes van en céntimos de PEN.

## ADDED Requirements

### Requirement: Creación de una verificación KYC simulada
El sistema SHALL crear, con `POST /kyc/verifications`, una verificación y una wallet con saldo cero, y devolver `201` con `id`, `wallet_id`, `scenario` y `status`. El campo `scenario` es opcional y su valor predeterminado es `APPROVED`. El sistema SHALL aceptar únicamente `documentType` `TEST` y un `document` con prefijo `TEST-`, y SHALL NOT evitar altas repetidas.

#### Scenario: Escenario aprobado
- **WHEN** se envía `{"documentType":"TEST","document":"TEST-001","scenario":"APPROVED"}`
- **THEN** la verificación queda `ACTIVE` y la wallet creada queda `ACTIVE` con saldo cero

#### Scenario: Escenario omitido
- **WHEN** se envía la solicitud sin `scenario`
- **THEN** se aplica `APPROVED`

#### Scenario: Escenario rechazado
- **WHEN** el escenario es `REJECTED`
- **THEN** la verificación y la wallet quedan `REJECTED`

#### Scenario: Revisión manual
- **WHEN** el escenario es `MANUAL_REVIEW`
- **THEN** la verificación y la wallet quedan `PENDING`
- **AND** se abre un caso de soporte `OPEN` por revisión KYC

#### Scenario: Proveedor no disponible
- **WHEN** el escenario es `UNAVAILABLE`
- **THEN** la respuesta es `503` con el error `KYC_UNAVAILABLE`
- **AND** no se crea ninguna wallet, verificación ni caso de soporte

#### Scenario: Entrada inválida
- **WHEN** el `documentType` no es `TEST`, el `document` no tiene prefijo `TEST-` o el `scenario` es desconocido
- **THEN** la respuesta es `400` y no se crea ninguna wallet

#### Scenario: Altas repetidas
- **WHEN** se envía dos veces la misma solicitud
- **THEN** se crean dos verificaciones y dos wallets independientes

### Requirement: Consulta de una verificación KYC
El sistema SHALL devolver, con `GET /kyc/verifications/{id}`, la verificación identificada por su ID kyc, que es distinto del `wallet_id`.

#### Scenario: Verificación existente
- **WHEN** se consulta el ID de una verificación creada
- **THEN** la respuesta es `200` con `id`, `wallet_id`, `scenario` y `status`

#### Scenario: Verificación inexistente
- **WHEN** se consulta un ID inexistente o el `wallet_id` en lugar del ID kyc
- **THEN** la respuesta es `404` con el error `NOT_FOUND`

### Requirement: Decisión sobre una verificación en revisión
El sistema SHALL aceptar, con `POST /kyc/verifications/{id}/decision`, la decisión `ACTIVE` o `REJECTED` sobre una verificación `PENDING`, actualizar el estado de su wallet y resolver su caso de soporte. Repetir la misma decisión SHALL devolver `200` y cambiar una decisión final SHALL devolver `409` con el error `DECISION_CONFLICT`. Las decisiones simultáneas contrarias SHALL dejar un único resultado final.

#### Scenario: Decisión de activación
- **WHEN** se decide `ACTIVE` sobre una verificación `PENDING`
- **THEN** la verificación y su wallet quedan `ACTIVE` y el caso de soporte queda `RESOLVED`

#### Scenario: Decisión de rechazo
- **WHEN** se decide `REJECTED` sobre una verificación `PENDING`
- **THEN** la verificación y su wallet quedan `REJECTED` y el caso de soporte queda `RESOLVED`

#### Scenario: Decisión repetida
- **WHEN** se repite la decisión ya tomada
- **THEN** la respuesta es `200` y el resultado se conserva

#### Scenario: Cambio de una decisión final
- **WHEN** se decide algo distinto de la decisión final ya tomada
- **THEN** la respuesta es `409` con el error `DECISION_CONFLICT` y el estado no cambia

#### Scenario: Decisión inválida
- **WHEN** la decisión no es `ACTIVE` ni `REJECTED`
- **THEN** la respuesta es `400` con el error `INVALID_DECISION`

#### Scenario: Verificación inexistente
- **WHEN** se decide sobre un ID inexistente
- **THEN** la respuesta es `404` con el error `NOT_FOUND`

#### Scenario: Decisiones simultáneas contrarias
- **WHEN** llegan a la vez decisiones `ACTIVE` y `REJECTED` sobre la misma verificación
- **THEN** solo una prevalece y la wallet y el caso de soporte coinciden con ella

### Requirement: Consulta del estado y saldos de una wallet
El sistema SHALL devolver, con `GET /wallets/{id}`, el estado y los saldos en céntimos de la wallet, con `available = balance - reserved` y `currency` `PEN`. La wallet `wallet-demo` SHALL existir precargada `ACTIVE` con saldo 100000.

#### Scenario: Wallet precargada
- **WHEN** se consulta `wallet-demo`
- **THEN** la respuesta es `200` con estado `ACTIVE`, `balance` 100000, `reserved` 0 y `available` 100000

#### Scenario: Saldo disponible
- **WHEN** una wallet tiene `balance` 50000 y `reserved` 12000
- **THEN** `available` es 38000

#### Scenario: Wallet inexistente
- **WHEN** se consulta una wallet inexistente
- **THEN** la respuesta es `404` con el error `NOT_FOUND`

### Requirement: Latencia simulada por solicitud
El sistema SHALL retrasar la respuesta de cualquier operación, también en errores, el número de milisegundos indicado en el header `X-Mock-Latency-Ms` o en el parámetro `latency` (entero de 0 a 5000, predeterminado 0), con prioridad del header. Un valor inválido SHALL devolver `400` con el error `INVALID_MOCK_LATENCY` antes de ejecutar la operación.

#### Scenario: Latencia válida
- **WHEN** se envía `X-Mock-Latency-Ms: 300`
- **THEN** la respuesta tarda al menos 300 ms y el header de respuesta informa el valor aplicado

#### Scenario: Latencia inválida
- **WHEN** el valor es mayor que 5000, negativo o no numérico
- **THEN** la respuesta es `400` con el error `INVALID_MOCK_LATENCY` y la operación no se ejecuta

### Requirement: Límite del tamaño del cuerpo
El sistema SHALL rechazar con `413` y el error `PAYLOAD_TOO_LARGE` las solicitudes con un cuerpo declarado mayor a 65536 bytes.

#### Scenario: Cuerpo demasiado grande
- **WHEN** se envía una solicitud de creación con un cuerpo mayor a 65536 bytes
- **THEN** la respuesta es `413` y no se crea ninguna wallet

### Requirement: Documento fuera de los registros
Los registros de aplicación SHALL NOT incluir el documento enviado ni sus valores, incluidos los rechazados por la validación.

#### Scenario: Registro de solicitudes con documento
- **WHEN** se procesan solicitudes de verificación aceptadas, rechazadas o no disponibles
- **THEN** los registros no contienen el documento enviado

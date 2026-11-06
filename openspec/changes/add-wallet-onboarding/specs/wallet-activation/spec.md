# Spec Delta

## Purpose

Activa la wallet cuando el usuario completa el onboarding y habilita el punto de entrada de pagos de bajo monto solo para wallets activas, con una confirmación que tolera repeticiones.

## ADDED Requirements

### Requirement: Activación al completar el onboarding
El sistema SHALL cambiar el estado de la wallet a activo cuando el usuario completa con éxito el último paso del onboarding.

#### Scenario: Onboarding completado
- **WHEN** el usuario completa correctamente el último paso
- **THEN** la wallet queda en estado activo
- **AND** el onboarding queda en estado completado

#### Scenario: Onboarding incompleto
- **WHEN** el usuario no ha completado todos los pasos
- **THEN** la wallet no pasa a estado activo

### Requirement: Confirmación idempotente de la activación
El sistema SHALL tratar de forma idempotente la confirmación final: repetirla con la misma clave de idempotencia, o después de completada, devuelve la wallet activa sin duplicar la activación ni sus eventos.

#### Scenario: Confirmación repetida
- **WHEN** el cliente envía dos veces la confirmación final con la misma clave de idempotencia
- **THEN** ambas respuestas son iguales y la wallet se activa una sola vez
- **AND** se registra un único evento de cierre del onboarding

#### Scenario: Confirmación tras completar
- **WHEN** se envía la confirmación final de un onboarding ya completado
- **THEN** el sistema devuelve la wallet activa sin errores ni efectos adicionales

### Requirement: Acceso al punto de entrada de pagos
El sistema SHALL permitir acceder al punto de entrada de pagos de bajo monto solo cuando la wallet está activa y SHALL informar al usuario qué debe completar cuando no lo está.

#### Scenario: Wallet activa
- **WHEN** el usuario con wallet activa consulta su acceso a pagos
- **THEN** el punto de entrada de pagos está habilitado

#### Scenario: Wallet no activa
- **WHEN** el usuario sin wallet activa intenta acceder al punto de entrada de pagos
- **THEN** el acceso se deniega con un mensaje que indica completar el onboarding

### Requirement: Consulta del estado de la wallet
El sistema SHALL permitir consultar el estado de la wallet de un usuario y SHALL distinguir los estados sin wallet, onboarding en curso y activa.

#### Scenario: Usuario con onboarding en curso
- **WHEN** se consulta el estado de un usuario con onboarding sin completar
- **THEN** el estado indica onboarding en curso y el paso actual

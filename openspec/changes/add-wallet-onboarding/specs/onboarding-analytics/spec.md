# Spec Delta

## Purpose

Registra los eventos de onboarding y de apertura de la app sin datos personales y deriva las métricas que permiten verificar las metas de la épica: duración mediana, nuevos usuarios activos por mes, atribución de adquisición, CAC y MAU.

## ADDED Requirements

### Requirement: Eventos de onboarding
El sistema SHALL registrar los eventos `onboarding_started` al iniciar un onboarding, `onboarding_step_completed` al completar cada paso, `onboarding_completed` al activarse la wallet y `onboarding_abandoned` al abandonarse. Cada evento SHALL incluir el identificador del onboarding, el nombre del paso cuando aplique y la marca de tiempo del servidor.

#### Scenario: Recorrido completo
- **WHEN** un usuario completa un onboarding de tres pasos
- **THEN** se registran `onboarding_started`, tres `onboarding_step_completed` y `onboarding_completed`, en ese orden

#### Scenario: Recarga sin duplicar el inicio
- **WHEN** el usuario recarga la aplicación durante el onboarding
- **THEN** no se registra un nuevo `onboarding_started`

#### Scenario: Abandono
- **WHEN** un onboarding se abandona por inactividad
- **THEN** se registra un único `onboarding_abandoned`

### Requirement: Evento de apertura de la aplicación
El sistema SHALL registrar un evento `app_opened` cuando el cliente lo informa, incluyendo los parámetros de adquisición si existen.

#### Scenario: Apertura con parámetros
- **WHEN** el cliente informa la apertura de la app con canal y campaña
- **THEN** se registra `app_opened` con esos parámetros

### Requirement: Privacidad de los eventos
Los eventos y los registros de aplicación SHALL contener únicamente campos de una lista blanca y SHALL NOT incluir DNI, CE, nombres, fecha de nacimiento, celular, correo, código OTP ni valores de formularios.

#### Scenario: Evento con campo no permitido
- **WHEN** se intenta registrar un evento con un campo fuera de la lista blanca
- **THEN** el campo no se registra y se informa el incumplimiento

#### Scenario: Registro de errores de validación
- **WHEN** falla la validación de un campo con un valor ingresado
- **THEN** ni los registros ni los eventos contienen el valor ingresado

### Requirement: Eventos atómicos con el cambio de estado
El sistema SHALL registrar cada evento en la misma transacción que el cambio de estado que lo origina, de modo que no existan cambios de estado sin evento ni eventos sin cambio.

#### Scenario: Fallo al confirmar el cambio
- **WHEN** falla la persistencia del cambio de estado de un paso
- **THEN** no queda registrado el evento de ese paso

### Requirement: Captura de adquisición
El sistema SHALL capturar el canal, la campaña y la referencia de adquisición con los que el usuario llegó y SHALL asociarlos al onboarding al iniciarlo.

#### Scenario: Entrada con parámetros
- **WHEN** el usuario llega con canal, campaña y referencia en la URL de entrada
- **THEN** el onboarding queda asociado a esos valores

#### Scenario: Entrada sin parámetros
- **WHEN** el usuario llega sin parámetros de adquisición
- **THEN** el onboarding queda asociado al canal "directo"

### Requirement: Duración mediana del onboarding
El sistema SHALL calcular la mediana de duración de los onboardings completados de una cohorte como la diferencia entre `onboarding_completed` y `onboarding_started`, en segundos, y SHALL excluir los onboardings no completados.

#### Scenario: Mediana de tres duraciones
- **WHEN** hay tres onboardings completados con duraciones de 120, 180 y 600 segundos
- **THEN** la mediana es de 180 segundos

#### Scenario: Cohorte sin completados
- **WHEN** la cohorte no tiene onboardings completados
- **THEN** la mediana se informa como no disponible

### Requirement: Nuevos usuarios activos por mes
El sistema SHALL contar por mes calendario, en la zona horaria `America/Lima`, los usuarios cuya wallet se activó ese mes.

#### Scenario: Activación cerca del fin de mes
- **WHEN** una wallet se activa a las 23:30 hora de Lima del último día del mes
- **THEN** cuenta en ese mes, aunque en UTC ya sea el mes siguiente

#### Scenario: Mes sin activaciones
- **WHEN** un mes no tiene activaciones
- **THEN** el conteo es cero

### Requirement: Registro del gasto de adquisición
El sistema SHALL permitir registrar el gasto de adquisición en soles por mes, canal y campaña, y SHALL conservar los montos en céntimos.

#### Scenario: Registro de gasto
- **WHEN** se registra un gasto de PEN 10,000.00 para un mes, canal y campaña
- **THEN** el gasto queda disponible para el cálculo del CAC de ese mes

#### Scenario: Gasto inválido
- **WHEN** se registra un gasto negativo
- **THEN** el sistema lo rechaza con un error de validación

### Requirement: Cálculo del CAC
El sistema SHALL calcular el CAC mensual como el gasto de adquisición total del mes dividido entre los nuevos usuarios activos del mes, y SHALL indicar si cumple la meta de PEN 10 por usuario nuevo. Si no hay activaciones, el CAC SHALL informarse como no disponible.

#### Scenario: CAC en la meta
- **WHEN** el gasto del mes es PEN 10,000.00 y hay 1,000 activaciones
- **THEN** el CAC es PEN 10.00 y cumple la meta

#### Scenario: CAC fuera de la meta
- **WHEN** el gasto del mes es PEN 12,000.00 y hay 1,000 activaciones
- **THEN** el CAC es PEN 12.00 y no cumple la meta

#### Scenario: Mes sin activaciones
- **WHEN** el mes tiene gasto registrado y cero activaciones
- **THEN** el CAC se informa como no disponible, sin error por división entre cero

### Requirement: CAC por canal y campaña
El sistema SHALL ofrecer el gasto, las activaciones y el CAC desglosados por canal y campaña.

#### Scenario: Desglose por canal
- **WHEN** se consulta el mes por canal
- **THEN** cada canal muestra su gasto, sus activaciones y su CAC

### Requirement: Usuarios activos mensuales frente al umbral
El sistema SHALL calcular los usuarios activos mensuales (MAU) como los usuarios distintos con al menos un evento `payment_succeeded` en el mes calendario de `America/Lima`, y SHALL indicar si el valor está dentro del rango de 1,000 a 2,000.

#### Scenario: MAU dentro del rango
- **WHEN** 1,500 usuarios distintos tienen un pago exitoso en el mes
- **THEN** el MAU es 1,500 y está dentro del rango

#### Scenario: MAU fuera del rango
- **WHEN** 800 usuarios distintos tienen un pago exitoso en el mes
- **THEN** el MAU es 800 y se informa fuera del rango

#### Scenario: Varios pagos del mismo usuario
- **WHEN** un usuario tiene cinco pagos exitosos en el mes
- **THEN** cuenta una sola vez en el MAU

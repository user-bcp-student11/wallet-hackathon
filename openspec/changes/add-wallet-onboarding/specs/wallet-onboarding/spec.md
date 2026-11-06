# Spec Delta

## Purpose

Guía al usuario por un onboarding de pasos definidos por el servidor, valida sus datos con reglas de Perú, bloquea el avance con mensajes accionables, y activa la wallet al completarlo para habilitar el punto de entrada de pagos de bajo monto.

## ADDED Requirements

### Requirement: Definición de pasos provista por el servidor
El sistema SHALL entregar al cliente la secuencia ordenada de pasos del onboarding, el paso actual, el total de pasos y el estado de cada paso (completado, actual o pendiente). El cliente SHALL NOT codificar la secuencia de pasos.

#### Scenario: Secuencia por defecto
- **WHEN** el cliente consulta un onboarding recién iniciado
- **THEN** recibe los pasos configurados en orden, con el primero como actual y los demás como pendientes

#### Scenario: Cambio de configuración
- **WHEN** el servidor se configura con una secuencia de pasos distinta
- **THEN** el cliente muestra la nueva secuencia sin cambios en el código del cliente

### Requirement: Progreso y siguiente paso visibles
La interfaz SHALL mostrar en todo momento el indicador "Paso X de N", la lista de pasos con su estado, y la instrucción y etiqueta del siguiente paso, con una única acción principal por pantalla.

#### Scenario: Paso intermedio
- **WHEN** el usuario está en el segundo de tres pasos
- **THEN** la pantalla muestra "Paso 2 de 3", el primer paso como completado y el tercero como pendiente

#### Scenario: Último paso
- **WHEN** el usuario está en el último paso
- **THEN** la acción principal indica que finaliza el registro

### Requirement: Inicio idempotente del onboarding
El sistema SHALL crear un onboarding al iniciarlo y devolver el onboarding en curso si el mismo usuario lo inicia de nuevo con la misma clave de idempotencia o recarga la aplicación, sin crear uno nuevo.

#### Scenario: Recarga durante el onboarding
- **WHEN** el usuario recarga la aplicación con un onboarding en curso
- **THEN** el sistema devuelve el mismo onboarding en su paso actual
- **AND** no se crea un onboarding nuevo

#### Scenario: Inicio repetido con la misma clave
- **WHEN** llegan dos solicitudes de inicio con la misma clave de idempotencia
- **THEN** ambas devuelven el mismo onboarding

### Requirement: Orden estricto de los pasos
El sistema SHALL aceptar únicamente el envío del paso actual y SHALL rechazar el envío de un paso posterior o ya completado.

#### Scenario: Salto de paso
- **WHEN** el cliente envía datos de un paso posterior al actual
- **THEN** el sistema rechaza la solicitud e indica cuál es el paso actual

### Requirement: Bloqueo del avance ante datos faltantes o inválidos
El sistema SHALL bloquear el avance al siguiente paso si falta información obligatoria o hay datos inválidos, y SHALL devolver un error por cada campo afectado con un mensaje en español que indique cómo corregirlo. Los datos ya ingresados SHALL conservarse.

#### Scenario: Campo obligatorio vacío
- **WHEN** el usuario envía un paso sin un campo obligatorio
- **THEN** el paso no avanza
- **AND** la respuesta lista el campo faltante con un mensaje accionable

#### Scenario: Varios campos inválidos
- **WHEN** el usuario envía un paso con dos campos inválidos
- **THEN** la respuesta contiene un error por cada campo
- **AND** los valores ingresados siguen disponibles para corregirlos

#### Scenario: Validación local insuficiente
- **WHEN** el cliente envía datos que su validación local habría bloqueado
- **THEN** el servidor aplica igualmente sus reglas y rechaza los datos inválidos

### Requirement: Reglas de validación de datos del usuario
El sistema SHALL aplicar en el servidor estas reglas: el celular tiene 9 dígitos y empieza con 9; el DNI tiene exactamente 8 dígitos; el carné de extranjería (CE) se acepta como tipo de documento alternativo con su formato; el usuario es mayor de edad; los nombres no están vacíos.

#### Scenario: Celular con formato inválido
- **WHEN** el usuario ingresa un celular de 9 dígitos que empieza con 8
- **THEN** el sistema lo rechaza con un mensaje que indica que debe empezar con 9

#### Scenario: DNI con longitud incorrecta
- **WHEN** el usuario ingresa un DNI de 7 o de 9 dígitos
- **THEN** el sistema lo rechaza con un mensaje que indica que debe tener 8 dígitos

#### Scenario: Usuario menor de edad
- **WHEN** la fecha de nacimiento corresponde a una persona menor de 18 años
- **THEN** el sistema bloquea el avance e indica que debe ser mayor de edad

#### Scenario: Documento CE válido
- **WHEN** el usuario elige CE e ingresa un número con el formato esperado
- **THEN** el sistema acepta el documento

### Requirement: Verificación del celular con OTP
El sistema SHALL solicitar al usuario un código de un solo uso enviado al celular y SHALL avanzar solo si el código ingresado es correcto. El envío del código SHALL pasar por un proveedor sustituible.

#### Scenario: Código correcto
- **WHEN** el usuario ingresa el código correcto
- **THEN** el paso de verificación se completa y el onboarding avanza

#### Scenario: Código incorrecto
- **WHEN** el usuario ingresa un código incorrecto
- **THEN** el paso no avanza y se muestra un mensaje para reintentar

#### Scenario: Proveedor simulado
- **WHEN** el sistema usa el proveedor simulado con un código fijo configurado
- **THEN** ese código se acepta como correcto

### Requirement: Abandono por inactividad
El sistema SHALL marcar como abandonado un onboarding en curso sin actividad durante un tiempo configurable. El valor por defecto es de 24 horas. Un onboarding abandonado SHALL NOT poder continuarse; el usuario inicia uno nuevo.

#### Scenario: Inactividad prolongada
- **WHEN** transcurre el tiempo configurado sin actividad en un onboarding en curso
- **THEN** el onboarding pasa a abandonado

#### Scenario: Actividad dentro del plazo
- **WHEN** el usuario avanza un paso antes de cumplirse el tiempo configurado
- **THEN** el plazo de inactividad se reinicia

#### Scenario: Continuar un onboarding abandonado
- **WHEN** el usuario intenta enviar un paso de un onboarding abandonado
- **THEN** el sistema lo rechaza e indica que debe iniciar un onboarding nuevo

### Requirement: Activación de la wallet al completar el onboarding
El sistema SHALL cambiar el estado de la wallet a activo cuando el usuario completa con éxito el último paso del onboarding, en la misma operación que marca el onboarding como completado.

#### Scenario: Onboarding completado
- **WHEN** el usuario completa correctamente el último paso
- **THEN** la wallet queda en estado activo
- **AND** el onboarding queda en estado completado

#### Scenario: Onboarding incompleto
- **WHEN** el usuario no ha completado todos los pasos
- **THEN** la wallet no pasa a estado activo

### Requirement: Confirmación idempotente de la activación
El sistema SHALL tratar de forma idempotente la confirmación final: repetirla con la misma clave de idempotencia, o después de completada, devuelve la wallet activa sin duplicar la activación.

#### Scenario: Confirmación repetida
- **WHEN** el cliente envía dos veces la confirmación final con la misma clave de idempotencia
- **THEN** ambas respuestas son iguales y la wallet se activa una sola vez

#### Scenario: Confirmación tras completar
- **WHEN** se envía la confirmación final de un onboarding ya completado
- **THEN** el sistema devuelve la wallet activa sin errores ni efectos adicionales

### Requirement: Consulta del estado de la wallet y acceso a pagos
El sistema SHALL permitir consultar el estado de la wallet de un usuario, distinguiendo los estados sin wallet, onboarding en curso (con el paso actual) y activa. SHALL permitir el acceso al punto de entrada de pagos de bajo monto solo cuando la wallet está activa e informar al usuario qué debe completar cuando no lo está.

#### Scenario: Wallet activa
- **WHEN** el usuario con wallet activa consulta su acceso a pagos
- **THEN** el punto de entrada de pagos está habilitado

#### Scenario: Wallet no activa
- **WHEN** el usuario sin wallet activa intenta acceder al punto de entrada de pagos
- **THEN** el acceso se deniega con un mensaje que indica completar el onboarding

#### Scenario: Usuario con onboarding en curso
- **WHEN** se consulta el estado de un usuario con onboarding sin completar
- **THEN** el estado indica onboarding en curso y el paso actual

### Requirement: Datos personales fuera de los registros
Los registros de aplicación SHALL NOT incluir DNI, CE, nombres, fecha de nacimiento, celular, código OTP ni valores de formularios, incluidos los valores rechazados por la validación.

#### Scenario: Registro de errores de validación
- **WHEN** falla la validación de un campo con un valor ingresado
- **THEN** los registros no contienen el valor ingresado

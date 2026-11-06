# Tasks

## 1. Fundamentos y contrato

- [x] 1.1 Registrar en `docs/architecture/adr/001-stack.md` las versiones exactas de Java, Spring Boot, Angular, PostgreSQL y herramientas de test, y verificar que el documento existe y lista cada versión
- [x] 1.2 Crear (o reutilizar si `payment-core` ya lo creó) el proyecto `backend/` con módulos `onboarding` y `wallet` en arquitectura hexagonal, y verificar que `./mvnw verify` compila y pasa
- [x] 1.3 Agregar la prueba ArchUnit que impide que `domain` dependa de Spring o de adaptadores, y verificar que pasa sobre el esqueleto
- [x] 1.4 Crear el proyecto `frontend/` Angular con feature `onboarding`, `core/` y `shared/`, y verificar que `ng build` y `ng test` terminan sin errores
- [x] 1.5 Redactar el contrato `docs/architecture/openapi.yaml` de onboarding, activación y consulta de estado, con Problem Details por campo y `Idempotency-Key`, y verificar que el archivo pasa un validador OpenAPI

## 2. Dominio y flujo de onboarding

- [x] 2.1 Implementar las reglas de validación de celular, DNI, CE, mayoría de edad y nombres, y verificar con pruebas de los escenarios "Celular con formato inválido", "DNI con longitud incorrecta", "Usuario menor de edad" y "Documento CE válido"
- [x] 2.2 Implementar la secuencia de pasos configurable y el agregado `Onboarding` con orden estricto, y verificar con pruebas de "Secuencia por defecto", "Cambio de configuración" y "Salto de paso"
- [x] 2.3 Implementar el envío de un paso con validación y errores por campo, y verificar con pruebas de "Campo obligatorio vacío", "Varios campos inválidos" y "Validación local insuficiente"
- [x] 2.4 Definir los puertos `OtpProviderPort` e `IdentityValidationPort` con fakes configurables (`OTP_FAKE_CODE`) y verificar con pruebas de "Código correcto", "Código incorrecto" y "Proveedor simulado"
- [x] 2.5 Implementar el inicio de onboarding con reutilización del onboarding en curso, y verificar con pruebas de "Recarga durante el onboarding" e "Inicio repetido con la misma clave"
- [x] 2.6 Implementar el job de abandono con `Clock` inyectado y `ONBOARDING_ABANDON_HOURS` (24 h por defecto), y verificar con pruebas de "Inactividad prolongada", "Actividad dentro del plazo" y "Continuar un onboarding abandonado"

## 3. Persistencia y API de onboarding

- [x] 3.1 Crear las migraciones Flyway de onboarding, pasos e idempotencia, y verificar que se aplican limpias sobre PostgreSQL con Testcontainers
- [x] 3.2 Implementar el repositorio con transiciones condicionales y un único onboarding en curso por usuario, y verificar con pruebas de integración de concurrencia
- [x] 3.3 Exponer los endpoints de inicio, consulta y envío de paso con `Idempotency-Key` y errores Problem Details en español, y verificar con pruebas MockMvc o RestAssured de cada escenario de validación, orden y OTP de `wallet-onboarding`
- [x] 3.4 Implementar el filtro de idempotencia por clave y onboarding, y verificar con una prueba que dos solicitudes con la misma clave devuelven la misma respuesta
- [x] 3.5 Implementar el enmascarado de logs y una prueba de privacidad que falle si un log contiene datos personales, y verificar con "Registro de errores de validación"

## 4. Activación de la wallet

- [x] 4.1 Implementar la activación en el último paso, con onboarding completado y wallet activa en una sola transacción, y verificar con pruebas de "Onboarding completado" y "Onboarding incompleto"
- [x] 4.2 Implementar la confirmación idempotente, y verificar con pruebas de "Confirmación repetida" y "Confirmación tras completar"
- [x] 4.3 Implementar la consulta del estado de la wallet y el acceso al punto de entrada de pagos, y verificar con pruebas de "Wallet activa", "Wallet no activa" y "Usuario con onboarding en curso"

## 5. Frontend de onboarding

- [x] 5.1 Generar o tipar el cliente HTTP desde `openapi.yaml` y crear el interceptor de `Idempotency-Key` (UUID por intento, reutilizado en reintentos), y verificar con una prueba unitaria del interceptor
- [x] 5.2 Implementar el stepper desde la definición del servidor con "Paso X de N", lista de pasos, instrucción y etiqueta del siguiente paso, y verificar con pruebas de "Paso intermedio", "Último paso" y "Cambio de configuración"
- [x] 5.3 Implementar los formularios reactivos tipados por tipo de paso con validación local y mapeo de errores del servidor a cada control conservando lo ingresado, y verificar con pruebas de "Campo obligatorio vacío" y "Varios campos inválidos"
- [x] 5.4 Implementar accesibilidad (etiquetas, `aria-describedby`, foco al primer error, objetivos táctiles de al menos 44 px) y textos es-PE centralizados, y verificar con pruebas de componente de foco y de mensajes
- [x] 5.5 Implementar la pantalla de activación y la habilitación del punto de entrada de pagos, y verificar con pruebas de "Onboarding completado" y "Wallet no activa"
- [x] 5.6 Agregar un E2E con Playwright en viewport móvil del recorrido completo hasta la wallet activa y de un error de validación recuperable, y verificar que pasa en verde

## 6. Verificación integral

- [x] 6.1 Elaborar `docs/qa/add-wallet-onboarding-trazabilidad.md` con una fila por escenario y su test, y verificar que todos los escenarios están en estado cubierto y en verde
- [x] 6.2 Ejecutar `./mvnw verify`, `ng test`, `ng build`, `npx playwright test` y `openspec validate add-wallet-onboarding --strict`, y verificar que terminan sin errores

## Workflow follow-up

- Confirmar con Producto y Cumplimiento la decisión provisional D2 antes de producción.
- Archivar el cambio cuando el Product Owner acepte la entrega.

# Tasks

## 1. Fundamentos y contrato

- [ ] 1.1 Registrar en `docs/architecture/adr/001-stack.md` las versiones exactas de Java, Spring Boot, Angular, PostgreSQL y herramientas de test, y verificar que el documento existe y lista cada versión
- [ ] 1.2 Crear (o reutilizar si `payment-core` ya lo creó) el proyecto `backend/` con módulos `onboarding`, `wallet` y `analytics` en arquitectura hexagonal, y verificar que `./mvnw verify` compila y pasa
- [ ] 1.3 Agregar la prueba ArchUnit que impide que `domain` dependa de Spring o de adaptadores, y verificar que pasa sobre el esqueleto
- [ ] 1.4 Crear el proyecto `frontend/` Angular con feature `onboarding`, `core/` y `shared/`, y verificar que `ng build` y `ng test` terminan sin errores
- [ ] 1.5 Redactar el contrato `docs/architecture/openapi.yaml` de onboarding, activación, consulta de estado, eventos de cliente y gasto de adquisición, con Problem Details por campo y `Idempotency-Key`, y verificar que el archivo pasa un validador OpenAPI

## 2. Dominio y flujo de onboarding

- [ ] 2.1 Implementar las reglas de validación de celular, DNI, CE, mayoría de edad y nombres, y verificar con pruebas de los escenarios "Celular con formato inválido", "DNI con longitud incorrecta", "Usuario menor de edad" y "Documento CE válido"
- [ ] 2.2 Implementar la secuencia de pasos configurable y el agregado `Onboarding` con orden estricto, y verificar con pruebas de "Secuencia por defecto", "Cambio de configuración" y "Salto de paso"
- [ ] 2.3 Implementar el envío de un paso con validación y errores por campo, y verificar con pruebas de "Campo obligatorio vacío", "Varios campos inválidos" y "Validación local insuficiente"
- [ ] 2.4 Definir los puertos `OtpProviderPort` e `IdentityValidationPort` con fakes configurables (`OTP_FAKE_CODE`) y verificar con pruebas de "Código correcto", "Código incorrecto" y "Proveedor simulado"
- [ ] 2.5 Implementar el inicio de onboarding con reutilización del onboarding en curso, y verificar con pruebas de "Recarga durante el onboarding" e "Inicio repetido con la misma clave"

## 3. Persistencia y API de onboarding

- [ ] 3.1 Crear las migraciones Flyway de onboarding, pasos, idempotencia y atribución, y verificar que se aplican limpias sobre PostgreSQL con Testcontainers
- [ ] 3.2 Implementar el repositorio con transiciones condicionales y un único onboarding en curso por usuario, y verificar con pruebas de integración de concurrencia
- [ ] 3.3 Exponer los endpoints de inicio, consulta y envío de paso con `Idempotency-Key` y errores Problem Details en español, y verificar con pruebas MockMvc o RestAssured de cada escenario de `onboarding-flow`
- [ ] 3.4 Implementar el filtro de idempotencia por clave y onboarding, y verificar con una prueba que dos solicitudes con la misma clave devuelven la misma respuesta

## 4. Activación de la wallet

- [ ] 4.1 Implementar la activación en el último paso, con onboarding completado y wallet activa en una sola transacción, y verificar con pruebas de "Onboarding completado" y "Onboarding incompleto"
- [ ] 4.2 Implementar la confirmación idempotente, y verificar con pruebas de "Confirmación repetida" y "Confirmación tras completar"
- [ ] 4.3 Implementar la consulta del estado de la wallet y el acceso al punto de entrada de pagos, y verificar con pruebas de "Wallet activa", "Wallet no activa" y "Usuario con onboarding en curso"

## 5. Frontend de onboarding

- [ ] 5.1 Generar o tipar el cliente HTTP desde `openapi.yaml` y crear el interceptor de `Idempotency-Key` (UUID por intento, reutilizado en reintentos), y verificar con una prueba unitaria del interceptor
- [ ] 5.2 Implementar el stepper desde la definición del servidor con "Paso X de N", lista de pasos, instrucción y etiqueta del siguiente paso, y verificar con pruebas de "Paso intermedio", "Último paso" y "Cambio de configuración"
- [ ] 5.3 Implementar los formularios reactivos tipados por tipo de paso con validación local y mapeo de errores del servidor a cada control conservando lo ingresado, y verificar con pruebas de "Campo obligatorio vacío" y "Varios campos inválidos"
- [ ] 5.4 Implementar accesibilidad (etiquetas, `aria-describedby`, foco al primer error, objetivos táctiles de al menos 44 px) y textos es-PE centralizados, y verificar con pruebas de componente de foco y de mensajes
- [ ] 5.5 Implementar la pantalla de activación y la habilitación del punto de entrada de pagos, y verificar con pruebas de "Onboarding completado" y "Wallet no activa"
- [ ] 5.6 Agregar un E2E con Playwright en viewport móvil del recorrido completo hasta la wallet activa y de un error de validación recuperable, y verificar que pasa en verde

## 6. Eventos analíticos

- [ ] 6.1 Implementar la tabla outbox y el registro de `onboarding_started`, `onboarding_step_completed` y `onboarding_completed` en la misma transacción que el cambio de estado, y verificar con pruebas de "Recorrido completo", "Recarga sin duplicar el inicio" y "Fallo al confirmar el cambio"
- [ ] 6.2 Implementar la lista blanca de campos y el enmascarado de logs, con una prueba de privacidad que falle si un evento o log contiene datos personales, y verificar con "Evento con campo no permitido" y "Registro de errores de validación"
- [ ] 6.3 Implementar el job de abandono con `Clock` inyectado y `ONBOARDING_ABANDON_HOURS` (24 h por defecto) que emite un único `onboarding_abandoned`, y verificar con pruebas de "Inactividad prolongada", "Actividad dentro del plazo" y "Continuar un onboarding abandonado"
- [ ] 6.4 Implementar el registro de `app_opened` en backend y su envío desde el cliente Angular, y verificar con una prueba de "Apertura con parámetros"
- [ ] 6.5 Implementar el despachador de la outbox y un publicador por defecto, y verificar con una prueba de que un fallo de publicación no altera el estado del onboarding

## 7. Métricas y adquisición

- [ ] 7.1 Capturar canal, campaña y referencia desde la URL de entrada en el cliente, enviarlos al iniciar y asociarlos al onboarding en el backend, y verificar con pruebas de "Entrada con parámetros" y "Entrada sin parámetros"
- [ ] 7.2 Implementar el registro de gasto de adquisición en céntimos por mes, canal y campaña, y verificar con pruebas de "Registro de gasto" y "Gasto inválido"
- [ ] 7.3 Implementar la mediana de duración del onboarding por cohorte, y verificar con pruebas de "Mediana de tres duraciones" (120, 180, 600 s) y "Cohorte sin completados"
- [ ] 7.4 Implementar el conteo mensual de nuevos usuarios activos en `America/Lima`, y verificar con pruebas de "Activación cerca del fin de mes" y "Mes sin activaciones"
- [ ] 7.5 Implementar el CAC mensual y por canal y campaña con su comparación con la meta de PEN 10, y verificar con pruebas de "CAC en la meta" (PEN 10,000 y 1,000 activaciones), "CAC fuera de la meta", "Mes sin activaciones" y "Desglose por canal"
- [ ] 7.6 Implementar el cálculo de MAU a partir de `payment_succeeded` frente al rango de 1,000 a 2,000, y verificar con pruebas de "MAU dentro del rango", "MAU fuera del rango" y "Varios pagos del mismo usuario"
- [ ] 7.7 Documentar en el README cómo registrar el gasto y consultar las métricas, y verificar que los ejemplos documentados se ejecutan tal cual

## 8. Verificación integral

- [ ] 8.1 Elaborar `docs/qa/add-wallet-onboarding-trazabilidad.md` con una fila por escenario y su test, y verificar que todos los escenarios están en estado cubierto y en verde
- [ ] 8.2 Ejecutar `./mvnw verify`, `ng test`, `ng build`, `npx playwright test` y `openspec validate add-wallet-onboarding --strict`, y verificar que terminan sin errores

## Workflow follow-up

- Confirmar con Producto y Cumplimiento las decisiones provisionales D2, D4 y D6 antes de producción.
- Archivar el cambio cuando el Product Owner acepte la entrega.

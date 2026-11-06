# Tasks

## 1. Andamiaje del proyecto

- [ ] 1.1 Crear el proyecto Maven con Spring Boot, Java 21 y JUnit 5, con paquetes `domain`, `application`, `adapters` y `composition`, y verificar que `mvn verify` compila y pasa una prueba de arranque del contexto
- [ ] 1.2 Agregar dependencias (web, validación, persistencia, migraciones, H2, PostgreSQL, Testcontainers) y verificar que `mvn verify` resuelve todas sin errores
- [ ] 1.3 Agregar una prueba de arquitectura que falle si `domain` o `application` importan clases de `adapters` o de Spring, y verificar que pasa en el proyecto vacío

## 2. Dominio de pagos (`payment-lifecycle`)

- [ ] 2.1 Implementar el valor monto (entero en unidad mínima, PEN) y la validación de pagador, destino y monto positivo, y verificar con pruebas unitarias del escenario "Monto inválido" y de campos faltantes
- [ ] 2.2 Implementar el agregado de pago con los estados `PENDING`, `SUCCEEDED`, `FAILED` y `EXPIRED`, referencia única y transiciones solo desde `PENDING`, y verificar con pruebas unitarias de los escenarios "Intento recién creado" y "Transiciones permitidas"
- [ ] 2.3 Hacer inmutable el estado terminal y producir una discrepancia ante resultados contradictorios o repetidos, y verificar con pruebas unitarias de "Resultado contradictorio posterior" y "Resultado repetido"
- [ ] 2.4 Modelar el historial de transiciones y el enlace de reintento al intento previo, y verificar con pruebas unitarias de "Historial de transiciones" y "Distinción de origen del intento"

## 3. Idempotencia (`payment-idempotency`)

- [ ] 3.1 Implementar la clave derivada de pagador, monto y destino con ventana anclada en la primera solicitud (configurable, 5 min por defecto), y verificar con pruebas unitarias de "Mismos datos, misma ventana" y "Datos distintos" usando un reloj fijo
- [ ] 3.2 Implementar las reglas de clave activa para `PENDING` y `SUCCEEDED` y de liberación para `FAILED` y `EXPIRED`, y verificar con pruebas unitarias de los escenarios de repetición y de reintento tras fallo o expiración, incluido el borde de fin de ventana

## 4. Casos de uso y puertos

- [ ] 4.1 Definir los puertos de salida (repositorio de pagos, proveedor, publicador de eventos, reloj) y los DTO de entrada y salida, y verificar que compila y que la prueba de arquitectura de 1.3 sigue pasando
- [ ] 4.2 Implementar el caso de uso crear pago (validación, clave de idempotencia, inicio ante el proveedor, rechazo del proveedor a `FAILED` y registro de duplicado con identificadores de solicitud y de correlación), y verificar con pruebas con puertos falsos de los escenarios de inicio, duplicado y "Proveedor rechaza al iniciar"
- [ ] 4.3 Implementar el caso de uso aplicar resultado del proveedor (éxito, fallo con código de motivo, referencia desconocida, resultado repetido y contradictorio), y verificar con pruebas con puertos falsos de los escenarios de `payment-provider-gateway`
- [ ] 4.4 Implementar los casos de uso consultar pago por referencia y expirar pendientes, y verificar con pruebas de "Consulta por referencia", "Referencia inexistente" y "Sin respuesta del proveedor" con reloj controlado

## 5. Persistencia relacional

- [ ] 5.1 Crear las migraciones del esquema (pagos, historial, idempotencia, duplicados, discrepancias, bandeja de salida) que apliquen en H2 y PostgreSQL, y verificar que se aplican limpias en ambos
- [ ] 5.2 Implementar el repositorio con transición condicional desde `PENDING` y restricción de unicidad de la clave activa, y verificar con pruebas de integración de round-trip y de transición condicional
- [ ] 5.3 Probar la concurrencia: solicitudes simultáneas con la misma clave crean un solo pago, y callback contra expiración deja un solo resultado terminal; verificar con pruebas de integración contra H2 y contra PostgreSQL con Testcontainers
- [ ] 5.4 Implementar la retención configurable de registros de idempotencia y duplicados (24 h por defecto), y verificar con una prueba de "Consulta dentro del periodo de retención" y otra de limpieza fuera del periodo

## 6. Proveedor simulado (`payment-provider-gateway`)

- [ ] 6.1 Implementar el adaptador simulado del puerto de proveedor con perfiles configurables (éxito, fallo con código, silencio, retraso, resultado repetido y contradictorio posterior), y verificar con pruebas de cada perfil
- [ ] 6.2 Entregar los resultados del simulador por el mismo camino de entrada que un callback real, y verificar con pruebas de "Escenario de fallo configurado", "Escenario de silencio configurado" y "Resultado contradictorio configurado"
- [ ] 6.3 Documentar en el README cómo seleccionar el perfil del simulador y verificar que el ejemplo documentado se ejecuta tal cual

## 7. Eventos (`payment-events`)

- [ ] 7.1 Escribir los eventos `payment_initiated`, `payment_succeeded`, `payment_failed`, `payment_expired` y `payment_duplicate_detected` en la bandeja de salida dentro de la misma transacción que la transición, con el contenido mínimo, y verificar con pruebas de contenido y de orden en los escenarios de "Pago exitoso", "Pago que expira" y "Solicitud duplicada"
- [ ] 7.2 Garantizar un solo evento terminal por intento ante callbacks repetidos o contradictorios, y verificar con la prueba de "Callback contradictorio"
- [ ] 7.3 Implementar el despachador que publica y marca los eventos y un publicador por defecto (registro en log), y verificar con la prueba de "Falla la emisión": el pago permanece correcto y el fallo queda registrado

## 8. API de entrada

- [ ] 8.1 Exponer crear pago, consultar pago por referencia y recibir resultado del proveedor, con propagación del identificador de correlación (se genera si falta), y verificar con pruebas de la capa web de cada operación
- [ ] 8.2 Mapear errores de validación, referencia inexistente y resultados rechazados a respuestas consistentes, y verificar con pruebas de los escenarios de error
- [ ] 8.3 Documentar los contratos de las tres operaciones en el README y verificar que los ejemplos de solicitud documentados funcionan contra la aplicación en ejecución

## 9. Expiración y configuración

- [ ] 9.1 Programar el barrido periódico de expiración y exponer como configuración la ventana de intento, el tiempo de espera, el periodo del barrido y la retención, y verificar con una prueba de integración con reloj controlado que un intento pendiente pasa a `EXPIRED` y uno resuelto a tiempo no
- [ ] 9.2 Documentar las propiedades de configuración y sus valores por defecto en el README y verificar que la aplicación arranca con los valores por defecto sin configuración adicional

## 10. Verificación de extremo a extremo

- [ ] 10.1 Probar por la API con el simulador los recorridos: pago exitoso, fallo con código y reintento, silencio con expiración, duplicado dentro de la ventana y éxito tardío tras expiración registrado como discrepancia, y verificar que cada recorrido deja el estado, los eventos y los registros esperados
- [ ] 10.2 Ejecutar `openspec validate payment-core` y `mvn verify` completos y verificar que ambos terminan sin errores

## Workflow follow-up

- Archivar el cambio cuando se cumplan los requisitos de revisión del proyecto.
- Planificar los cambios siguientes sobre este núcleo: onboarding (W1), pago del pagador (W2), estado QR para comercios (W3), fallas y reversos (W4) y conciliación (W6).

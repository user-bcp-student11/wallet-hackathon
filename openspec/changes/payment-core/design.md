# Design

## Context

El repositorio no tiene código; solo existen la épica y las seis historias en `resources/`. Los requisitos de comportamiento están en `specs/` de este cambio. Restricciones que condicionan el enfoque:

- El ecosistema es multirriel y las integraciones reales son contractuales, así que el núcleo no puede acoplarse a un proveedor.
- La wallet no guarda saldo; el registro interno solo contiene intentos y resultados.
- Los estados llegan de forma asíncrona, por lo que el sistema debe tolerar callbacks tardíos, repetidos y contradictorios.
- Pila: Java 21, Spring Boot 3.x, Maven, PostgreSQL y Flyway; pruebas con JUnit 5 y Testcontainers. Versiones exactas en `docs/architecture/adr/001-stack.md`.
- Estructura: monolito modular en `backend/` con arquitectura hexagonal por módulo. Este cambio crea el módulo `payments` (`domain`, `application`, `adapters.in.web`, `adapters.out.persistence`, `adapters.out.provider`) junto a `onboarding`, `wallet` y `analytics` de `add-wallet-onboarding`.

## Goals / Non-Goals

**Goals:**
- Un dominio de pagos puro y testeable sin proveedor, base de datos ni transporte reales.
- Transiciones de estado atómicas y resistentes a concurrencia (callback contra expiración, solicitudes simultáneas).
- Eventos y registros suficientes para que W2, W3, W4 y W6 se construyan encima sin rediseñar el núcleo.

**Non-Goals:**
- Interfaz de usuario, autenticación y autorización de pagadores.
- Reglas de monto bajo por proveedor y canal (cambio W2).
- Consultas orientadas al comercio, rutas de soporte y reportes de conciliación (W3, W4, W6).
- Multimoneda: el MVP opera en soles (PEN) y el monto se maneja como entero en la unidad mínima.

## Decisions

### 1. Puertos y adaptadores con dominio sin dependencias externas

El dominio y los casos de uso solo conocen puertos. Los adaptadores (API, persistencia, proveedor simulado, publicación de eventos, reloj) se ensamblan en un único punto de composición.

```
 API entrada --> [Casos de uso] --> Dominio (Payment, estados, clave)
 Callback proveedor -->   |
                          +--> PaymentRepositoryPort
                          +--> PaymentProviderPort  <-- adaptador simulado
                          +--> EventPublisherPort
                          +--> ClockPort
```

Alternativa descartada: capas tradicionales con el proveedor llamado desde servicios. Mezcla reglas de estado con E/S y dificulta probar escenarios de fallo y expiración, que son el centro del MVP.

### 2. Máquina de estados dentro del dominio

El agregado de pago expone transiciones explícitas desde `PENDING` hacia cada estado terminal. Un estado terminal rechaza cualquier transición posterior. Cuando llega un resultado distinto sobre un intento terminal, el caso de uso lo guarda como discrepancia y no modifica el pago.

Las transiciones se persisten con actualización condicional ("solo si sigue en `PENDING`"). Así, si un callback y el barrido de expiración compiten, solo uno gana y el otro se trata como resultado posterior.

Alternativa descartada: permitir `EXPIRED` a `SUCCEEDED` si el proveedor confirma tarde. Contradice el requisito de resultado terminal único. El caso queda como discrepancia para conciliación (W6).

### 3. Idempotencia con clave derivada, ventana anclada y liberación

- Clave: huella determinista de pagador, monto y destino. La ventana empieza en la primera solicitud y dura el valor configurado (5 min por defecto). No se usan intervalos fijos de reloj, para que un reintento no caiga en otra ventana por un borde.
- Se mantiene un registro de idempotencia con la clave, la referencia del intento y el fin de la ventana.
- Una solicitud con clave activa y el intento en `PENDING` o `SUCCEEDED` devuelve el resultado original. En `FAILED` o `EXPIRED` la clave se libera y se crea un intento enlazado como reintento.
- La comprobación y la inserción de la clave activa son atómicas (restricción de unicidad sobre la clave activa), para que dos solicitudes simultáneas no creen dos pagos.

Alternativa descartada: clave generada por el cliente por intento. Habría evitado bloquear dos pagos legítimos idénticos dentro de la ventana, pero se decidió seguir la definición literal de la historia W5. La consecuencia queda registrada en Riesgos.

### 4. Expiración por barrido periódico

Un proceso periódico busca intentos en `PENDING` con antigüedad mayor al tiempo de espera y los lleva a `EXPIRED` mediante la transición condicional de la decisión 2. El tiempo de espera y el periodo del barrido son configurables.

Alternativa descartada: temporizador en memoria por intento. Se pierde al reiniciar el proceso y deja intentos eternamente pendientes.

### 5. Proveedor simulado dirigido por configuración

El puerto de proveedor ofrece iniciar un pago; los resultados regresan por un caso de uso de entrada separado ("aplicar resultado del proveedor"), igual que lo haría un callback real. El adaptador simulado selecciona su comportamiento (éxito, fallo con código, silencio, retraso, repetido, contradictorio posterior) según un perfil configurable. Un adaptador real posterior solo debe implementar el mismo puerto.

Alternativa descartada: simulación con respuesta síncrona inmediata. No ejercita el comportamiento asíncrono, que es el riesgo principal de la épica.

### 6. Eventos con bandeja de salida (outbox)

Cada transición escribe sus eventos en una tabla de salida dentro de la misma transacción que el cambio de estado. Un despachador los publica por el puerto de eventos y los marca como enviados. Así un fallo al publicar no altera el pago y no se pierden eventos ni se emite más de un evento terminal por intento.

Alternativa descartada: publicar directamente tras confirmar. Puede perder el evento si el proceso falla entre ambos pasos, y el evento de activación alimenta el MAU.

### 7. Modelo de datos del registro interno

Elementos persistidos: pago (referencia, pagador, destino, monto en unidad mínima, estado, tiempos, enlace al intento previo), historial de transiciones, registro de idempotencia, registro de duplicados (identificador de solicitud, identificador de correlación, referencia original), discrepancias (resultado recibido y motivo) y bandeja de salida de eventos. El esquema se versiona con migraciones Flyway aditivas sobre PostgreSQL; las restricciones de unicidad y las actualizaciones condicionales de las decisiones 2 y 3 se apoyan en él. Las pruebas de integración usan PostgreSQL real con Testcontainers, sin base en memoria alterna.

### 8. Operaciones expuestas por la entrada

Tres operaciones: crear pago, consultar pago por referencia y recibir resultado del proveedor. El identificador de correlación viaja en cada solicitud y se propaga a registros y eventos; si no llega, se genera uno.

### 9. Reloj y configuración inyectables

El tiempo se obtiene por un puerto de reloj para poder probar ventanas y expiración sin esperas reales. Los valores por defecto (ventana 5 min, expiración 5 min, retención 24 h) son configuración, no constantes.

## Risks / Trade-offs

- [Dos pagos legítimos idénticos dentro de la ventana se tratan como duplicado] → Decisión aceptada del producto; la ventana corta (5 min) limita el impacto y el segundo pago devuelve un resultado claro, no un error silencioso. Se reevalúa tras el MVP.
- [Un éxito tardío del proveedor tras `EXPIRED` significa dinero movido con intento expirado] → Se registra como discrepancia con la referencia; queda como entrada para conciliación (W6) y soporte (W4).
- [Competencia entre callback y expiración, o entre solicitudes simultáneas] → Transiciones condicionales y restricción de unicidad en la clave activa; pruebas de concurrencia explícitas.
- [El proveedor simulado da falsa confianza sobre el real] → El contrato de proveedor se mantiene mínimo y el simulador reproduce fallos, silencios y duplicados; la integración real es un cambio posterior.
- [Valores de ventana, expiración y retención sin validar con negocio] → Son configurables y figuran como supuestos en el proposal.

## Open Questions

- ¿Los valores por defecto de ventana, expiración y retención son aceptables para producto y operaciones? Cambiarlos no altera especificaciones ni tareas.

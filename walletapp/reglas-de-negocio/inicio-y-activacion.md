# Reglas de negocio · Inicio y activación: rutas y navegación

## 1. Rutas

Solo hay dos rutas, **sin protección por ahora** (no hay guards).

| Ruta          | Componente                                         | Contenido                                                                                  |
| ------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `/`           | `Home` (`features/home/home.ts`)                   | Landing del concepto: mensaje de marca y el acceso «¿Aún no tienes una cuenta? Regístrate» |
| `/activacion` | `Activation` (`features/activation/activation.ts`) | «Activa tu wallet»: formulario de tipo y número de documento y, al enviar, el resultado    |
| `**`          | —                                                  | Redirige a `/`                                                                             |

Definidas en `src/app/app.routes.ts`. Ambas se cargan de forma diferida (`loadComponent`).

## 2. Flujo

1. La persona entra a `/` y ve la landing.
2. La landing ofrece **tres accesos a `/activacion`** (enlaces de Angular, no botones de acción):
   - **Regístrate**, para quien aún no tiene cuenta.
   - **Ya tengo cuenta: activar mi wallet**, para quien ya la tiene.
   - **Activa tu wallet →**, dentro de la tarjeta «Paga y transfiere». La tarjeta y sus etiquetas
     («Pagos con QR», «Transferencias») no son controles; solo ese enlace lo es.

   Hoy los tres llevan a la misma pantalla: el alta de personas nuevas no está implementada y no
   existe inicio de sesión (ver «Dependencias pendientes»).

3. En `/activacion` elige el tipo de documento (DNI o CE), escribe el número ficticio y pulsa
   **Continuar**: la pantalla **consulta la persona** (`POST /persons/lookup`).
4. Si existe, aparece «Encontramos tu registro» y **Activar wallet** inicia la activación
   (`POST /kyc/verifications` con su `userId`). Si no existe, solo se informa; el alta de personas
   nuevas no está implementada.
5. El resultado (wallet activa, pendiente de revisión o rechazada) se muestra en la misma pantalla,
   con el saldo en soles de `GET /wallets/{id}`.
6. **Volver al inicio** (arriba de la tarjeta) regresa a `/`.

Detalle del contrato y de las respuestas: [`activacion-con-documento.md`](activacion-con-documento.md).

Tras cada navegación el foco pasa al contenido principal para teclado y lectores de pantalla.

## 3. Reglas

- «Regístrate» está **siempre disponible**: no consulta ninguna API ni comprueba si la persona ya
  tiene cuenta. La existencia de la persona solo se consulta **después**, ya en `/activacion`, y
  solo `404 PERSON_NOT_FOUND` significa «no existe»: un error de conexión o de servicio nunca se
  presenta como ausencia.
- La wallet no se «activa» con una acción adicional: el estado (`ACTIVE`, `PENDING` o `REJECTED`)
  lo devuelve `POST /kyc/verifications`. La pantalla `/activacion` es donde ocurre ese proceso y se
  muestra su resultado.
- `/activacion` es accesible directamente (sin protección): al recargar la página no se conserva el
  resultado, porque solo vive en memoria.

## 4. Dependencias pendientes con backend

- **Autenticación / inicio de sesión:** el OpenAPI indica «Sin autenticación» y no define ningún
  endpoint de sesión. Por eso la landing **no incluye «Iniciar sesión»** ni se inventó ese flujo.
  Si la pantalla inicial debe requerir autenticación, hay que acordar con backend el contrato
  (endpoints, tokens, expiración) antes de implementarlo.
- **Protección de rutas:** cuando exista autenticación, decidir qué rutas se protegen (por ejemplo,
  `/activacion`) y qué ocurre con una sesión caducada.
- **Consulta de persona por documento:** existe en el mock solo para la demostración y expone el
  riesgo de enumeración de usuarios; en producción requiere autenticación y autorización (ver
  `activacion-con-documento.md`, sección 5).
- **Prevención de registros repetidos:** con persona, el mock responde `200` con la wallet
  existente; con la forma heredada `TEST` no se evitan. Confirmar la regla real.
- Contrato de producción del documento de identidad: ver `documento-de-identidad.md`.

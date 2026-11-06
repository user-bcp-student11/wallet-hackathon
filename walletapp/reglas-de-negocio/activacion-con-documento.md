# Activación de la wallet con DNI o CE (happy path)

> **Solo demostración, con datos ficticios.** La verificación es simulada: no valida identidad real
> y **no deben ingresarse datos reales** (DNI, CE, nombres ni fechas de nacimiento), ni en la
> pantalla ni en `mock-server/db.seed.json`. Este documento describe el contrato del mock; el
> contrato de producción, sus validaciones y el tratamiento de datos personales deben acordarse con
> **backend y producto**.

Contrato: [`bcp-wallet-mock-openapi.yaml`](../../bcp-wallet-mock-openapi.yaml) (versión 0.4.0).
Implementación: `mock-server/server.mjs` (servidor) y `src/app/features/activation` (pantalla).

## 1. Flujo

```text
Pantalla /activacion                               mock-server
────────────────────                               ───────────
1. Elige DNI o CE e ingresa el número ficticio
2. «Continuar»  ─────────  POST /persons/lookup ─▶  ¿existe esa persona?
                          { documentType, documentNumber }
                ◀─ 200 { userId }  (solo el GUID)    sí
                ◀─ 404 PERSON_NOT_FOUND              no  → «No encontramos a nadie…»
3. «Encontramos tu registro» → «Activar wallet»
                ─────────  POST /kyc/verifications ─▶  verifica persona y documento
                          { userId, documentType,
                            document, scenario }
                ◀─ 201 { id, wallet_id, scenario, status: ACTIVE }
4. Consulta el saldo ────  GET /wallets/{wallet_id} ─▶  saldo 0 (se muestra en soles)
```

- Si la persona **no existe**, la pantalla solo informa que no se encontró. El alta de personas
  nuevas **no está implementada**.
- Un **error de conexión, un 5xx o un 404 sin el código `PERSON_NOT_FOUND`** nunca se muestra como
  «persona inexistente»: la pantalla dice explícitamente que no significa que no esté registrada.
- Se muestra carga en cada paso y no se permiten envíos simultáneos (consulta ni activación).

## 2. Personas de prueba (seed)

`mock-server/db.seed.json` incluye, en `persons`, dos personas ficticias: una con **DNI** y otra con
**carné de extranjería (CE)**, cada una con `userId` (GUID), `firstName`, `lastName`, `birthDate` y
`document { type, number }`.

- Los números del seed son ficticios y **no definen** longitud ni formato de DNI o CE (por ejemplo,
  el del CE es alfanumérico): son solo valores de prueba.
- Revisa que el seed **no contenga datos de personas reales**. Si alguno lo es, reemplázalo.
- El frontend **no recibe el seed**: solo obtiene el `userId` de la persona que consultó. Nombre,
  apellido y fecha de nacimiento nunca salen del servidor.
- Los tests del servidor leen las personas del seed en lugar de fijar sus datos.
- Un `db.json` creado con una versión anterior no tiene `persons`: el servidor lo completa desde el
  seed. Para restaurar todos los datos: `npm run mock:reset`.

## 3. Operaciones

### `POST /persons/lookup` (solo demostración)

| Entrada (cuerpo)                                           | Respuesta                              |
| ---------------------------------------------------------- | -------------------------------------- |
| `{ "documentType": "DNI" \| "CE", "documentNumber": "…" }` | `200 { "userId": "<GUID>" }` si existe |
| Persona inexistente                                        | `404 { "error": "PERSON_NOT_FOUND" }`  |
| Cuerpo o tipo inválido                                     | `400 { "error": "INVALID_REQUEST" }`   |
| Cuerpo mayor a 65536 bytes                                 | `413`                                  |

- Devuelve **únicamente** el `userId`.
- El número va en el cuerpo y no en la URL (no queda en registros de acceso); el servidor tampoco
  registra cuerpos.
- No valida longitud ni formato; la comparación es **exacta**, sin normalizar espacios ni
  mayúsculas. Es una decisión pendiente de producto.

### `POST /kyc/verifications` (operación existente, ampliada)

Se reutiliza la misma operación; **no se creó un endpoint duplicado**. Admite dos formas de
solicitud y devuelve siempre el esquema `Kyc` (sin cambios):

```json
{
  "userId": "<GUID>",
  "documentType": "DNI",
  "document": "<número ficticio>",
  "scenario": "APPROVED"
}
```

```json
{
  "id": "<id de verificación>",
  "wallet_id": "<id de wallet>",
  "scenario": "APPROVED",
  "status": "ACTIVE"
}
```

El servidor, con `userId`: (1) valida el cuerpo; (2) comprueba que la persona exista; (3) comprueba
que `documentType` y `document` coincidan con los de esa persona; (4) si la persona ya tiene una
verificación, **no crea otra wallet**; (5) aplica el `scenario`.

| Situación                                                | Respuesta                                                                        |
| -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Happy path (`APPROVED`)                                  | `201` con la verificación nueva; wallet `ACTIVE` con saldo cero                  |
| **Activación repetida** (la persona ya tenía una)        | **`200`** con la **verificación existente**; no se crea otra wallet ni otro caso |
| `userId` no existe                                       | `404 PERSON_NOT_FOUND`                                                           |
| Tipo o número no coinciden con la persona                | `422 DOCUMENT_MISMATCH`                                                          |
| Cuerpo inválido (`userId` no es GUID, falta `document`…) | `400 INVALID_REQUEST`                                                            |
| `scenario: REJECTED`                                     | `201`, wallet `REJECTED`                                                         |
| `scenario: MANUAL_REVIEW`                                | `201`, wallet `PENDING` y caso de soporte `OPEN`                                 |
| `scenario: UNAVAILABLE`                                  | `503 KYC_UNAVAILABLE`, no crea nada (se puede reintentar)                        |

**Activación repetida (decisión documentada):** es idempotente. La segunda llamada con el mismo
usuario devuelve `200` con el mismo `id`, `wallet_id`, `scenario` y `status` de la primera, aunque
pida otro `scenario` (se ignora). La pantalla lo detecta por el `200` y avisa: «Esta persona ya
tenía una wallet de prueba: mostramos la existente y no se creó otra». Si la primera quedó
`PENDING` o `REJECTED`, se devuelve ese mismo estado.

El resultado y el saldo se consultan, como antes, con `GET /kyc/verifications/{id}` y
`GET /wallets/{id}`.

## 4. Compatibilidad con el contrato anterior

El contrato pasa de aceptar solo `documentType: "TEST"` a una solicitud `oneOf`:

| Cliente                  | Solicitud                                                              | Efecto                                                                               |
| ------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Existente (heredada)** | `{ "documentType": "TEST", "document": "TEST-…", "scenario"? }`        | **Sin cambios**: mismas respuestas y sin `userId`. Sigue sin evitar altas repetidas. |
| **Nuevo (persona)**      | `{ "userId", "documentType": "DNI" \| "CE", "document", "scenario"? }` | Flujo de este documento.                                                             |

- Se **conservan** los escenarios `APPROVED`, `REJECTED`, `MANUAL_REVIEW` y `UNAVAILABLE` en ambas
  formas, y la respuesta `Kyc` no cambia.
- Un `userId` enviado junto con `TEST` se ignora (como cualquier campo adicional).
- No hay incompatibilidad para clientes que ya envían `TEST`. Sí hay matices:
  - `documentType` ahora admite también `DNI` y `CE`; un cliente generado con validación estricta
    del enum antiguo debe regenerarse.
  - El esquema de la solicitud pasó de un objeto inline a `oneOf` (`KycPersonRequest`,
    `KycTestRequest`); los generadores de código verán un tipo unión.
  - La operación documenta ahora las respuestas `200`, `404` y `422`.
- **Esta aplicación** ya no envía la forma `TEST` (antes generaba un identificador `TEST-…` y
  descartaba el número). Ahora envía el tipo y el número ficticio tal como se escribieron.

## 5. Riesgo de enumeración de usuarios y requisitos para producción

`POST /persons/lookup` responde distinto si una persona existe (`200`) o no (`404`). Abierto y sin
control, permite **enumerar** qué documentos están registrados probando valores (el espacio de
números es pequeño y predecible), lo que expone datos personales y facilita fraude o phishing
dirigido. En este mock **no hay autenticación, autorización ni límites** y **no debe exponerse
fuera de un entorno de pruebas**.

Mitigaciones que el mock ya aplica: devuelve solo el `userId` (nunca nombre, apellido ni fecha de
nacimiento), el número va en el cuerpo y no en la URL, y no se registran cuerpos de solicitud.

**Para producción (a acordar con backend y producto):**

- Exigir **autenticación y autorización**: quién puede consultar y qué datos puede ver.
- **Limitar la frecuencia** de consultas y detectar abuso; auditar accesos sin registrar el número.
- No revelar la existencia de una persona a quien no esté autenticado; que la activación no
  dependa de un identificador conocido o adivinable (el `userId` no es una credencial).
- Minimizar los datos devueltos, cifrar en tránsito y definir retención y consentimiento.
- Definir las **validaciones de DNI y CE** (longitud, caracteres, dígito verificador,
  normalización) y los mensajes de error con producto.
- Sustituir la verificación simulada por un proveedor real y definir su evidencia.
- Definir el **alta de personas nuevas**, hoy fuera de alcance.

## 6. Pruebas

- Servidor (`npm run mock:test`): consulta por DNI y CE, persona inexistente, solo `userId` en la
  respuesta, happy path con ambos tipos, `userId` inexistente, documento no coincidente (número,
  tipo y de otra persona), activación repetida (200 sin segunda wallet), escenarios conservados,
  compatibilidad con `TEST`, validaciones y que nada se escribe en los casos de error.
- Frontend (`npm test`): formulario, consulta (DNI y CE), no encontrado, error de conexión / 503 /
  404 genérico que **no** se muestran como «no existe», activación con ambos tipos, saldo en soles,
  activación repetida, no coincidente y envíos simultáneos.

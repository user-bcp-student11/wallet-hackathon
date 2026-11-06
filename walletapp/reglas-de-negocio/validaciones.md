# Reglas de negocio · Activación de la wallet (W1): validaciones y mensajes

Validaciones y comportamiento de la pantalla de activación (`/activacion`). La fuente de verdad del
contrato del mock es [`bcp-wallet-mock-openapi.yaml`](../../bcp-wallet-mock-openapi.yaml). Si
cambias una regla, actualiza este archivo, el código y las pruebas en
`src/app/features/activation/activation.spec.ts`.

> Flujo y contrato con DNI/CE: [`activacion-con-documento.md`](activacion-con-documento.md). Reglas
> del documento: [`documento-de-identidad.md`](documento-de-identidad.md). Rutas:
> [`inicio-y-activacion.md`](inicio-y-activacion.md).
>
> **Demostración con verificación simulada y datos ficticios.** El contrato de producción, las
> validaciones de DNI/CE y el tratamiento de datos deben acordarse con backend y producto.

## 1. Datos que pide la pantalla

| Campo               | Control                      | Validación implementada                 |
| ------------------- | ---------------------------- | --------------------------------------- |
| Tipo de documento   | Selector: DNI o CE           | Obligatorio                             |
| Número de documento | Campo de texto independiente | Obligatorio (no vacío ni solo espacios) |

- La persona **no escribe prefijos técnicos** (`TEST-`, `DNI-`, `CE-`).
- No se asume longitud ni formato de DNI o CE: están **pendientes de definir con producto**.
- Indicación discreta bajo el formulario: «Verificación simulada. Usa únicamente datos ficticios».

| Situación                 | Mensaje al usuario                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| Tipo sin elegir           | `Selecciona el tipo de documento: DNI o carné de extranjería (CE).`                        |
| Número vacío              | `Ingresa el número de tu documento. En este entorno de prueba usa un número ficticio.`     |
| Envío con datos inválidos | Alerta `Revisa los datos antes de continuar. <motivo>` y foco en el primer campo con error |

Los errores se muestran junto al campo al salir de él (blur) o al enviar; con datos inválidos no se
llama a la API.

## 2. Pasos y llamadas

| Paso                  | Acción                    | Llamada                                                                              |
| --------------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| 1. Formulario         | **Continuar**             | `POST /persons/lookup` `{ documentType, documentNumber }`                            |
| 2. Persona encontrada | **Activar wallet**        | `POST /kyc/verifications` `{ userId, documentType, document, scenario: "APPROVED" }` |
| 3. Resultado          | (automático tras activar) | `GET /wallets/{wallet_id}` para el saldo                                             |

- El número se envía **tal como se escribió** (sin normalizar, sin prefijos).
- Mientras una solicitud está en curso se muestra «Consultando…» o «Activando…», el botón queda
  deshabilitado y no se permiten envíos simultáneos.
- Cada nuevo intento limpia el error anterior.
- **Persona no encontrada:** solo se informa; no hay formulario de alta.

## 3. Consulta de persona (`POST /persons/lookup`)

| Respuesta                                               | Qué muestra la pantalla                                                                                                    |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `200 { userId }`                                        | «Encontramos tu registro», con el documento ingresado y el botón **Activar wallet**                                        |
| `404` con `PERSON_NOT_FOUND`                            | `No encontramos a nadie con ese documento. Revisa el tipo y el número (en esta demostración solo hay personas ficticias).` |
| Sin respuesta (estado `0`: red, servidor apagado, CORS) | `No pudimos consultar tu documento porque no hay conexión con el servicio. Esto no significa que no estés registrado: …`   |
| `5xx`                                                   | `El servicio de consulta no está disponible en este momento. Esto no significa que no estés registrado: …`                 |
| `404` **sin** el código `PERSON_NOT_FOUND`              | Error genérico: `No pudimos completar la consulta. Esto no significa que no estés registrado: …`                           |
| `400` / `413`                                           | `No pudimos validar los datos ingresados. Revisa el tipo y el número de documento.`                                        |

**Solo `404` con `PERSON_NOT_FOUND` significa «no existe».** Un error de conexión, un `5xx` o una
ruta equivocada nunca se interpretan como ausencia de la persona. La pantalla no muestra el
`userId` ni datos personales (el servidor solo devuelve el GUID). Implementación:
`src/app/core/person/person-error.ts`.

## 4. Activación (`POST /kyc/verifications`) y resultado

| Respuesta                          | Qué muestra la pantalla                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `201`                              | El resultado según `status`, con el saldo consultado en `GET /wallets/{id}`                                             |
| `200` (la persona ya tenía wallet) | El mismo resultado, más el aviso «Esta persona ya tenía una wallet de prueba: mostramos la existente y no se creó otra» |

Importes en céntimos de PEN; se muestran en soles (`S/ 0.00`). Si la consulta del saldo falla, el
resultado se muestra igual con «Saldo disponible: No disponible por ahora». El `id` de verificación
y el `wallet_id` se conservan solo en memoria (`RegistrationSession`).

El resultado indica siempre que la verificación es **simulada**: «el servicio de demostración solo
comprueba que el documento coincida con una persona ficticia de prueba. No es una verificación de
identidad real».

| `status`   | Título                                 | Qué explica al usuario                                                                |
| ---------- | -------------------------------------- | ------------------------------------------------------------------------------------- |
| `ACTIVE`   | ¡Tu wallet de prueba está activa!      | La verificación simulada devolvió «aprobada» y la wallet de prueba está activa.       |
| `PENDING`  | Tu wallet de prueba está en revisión   | Falta la decisión de una persona del equipo; mientras tanto no se pueden hacer pagos. |
| `REJECTED` | No pudimos activar tu wallet de prueba | La verificación simulada fue rechazada; la wallet no puede hacer pagos.               |

## 5. Errores de la activación

| Situación                                            | Mensaje al usuario                                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `422 DOCUMENT_MISMATCH` (tipo o número no coinciden) | `El documento no coincide con el registro encontrado. Revisa el tipo y el número e inténtalo de nuevo.`                                     |
| `404 PERSON_NOT_FOUND`                               | `No encontramos a la persona para activar la wallet. Vuelve a consultar tu documento.`                                                      |
| Sin respuesta (estado `0`)                           | `No pudimos conectarnos con el servicio. Revisa tu conexión a internet y vuelve a intentarlo.`                                              |
| `400` / `413`                                        | `No pudimos validar tu registro. Revisa el tipo y el número de documento y vuelve a intentarlo.`                                            |
| `429` `GROUP_LIMIT_RESET_REQUIRED` (solo cloud)      | `Se alcanzó el límite de pruebas de este grupo. Reinicia el grupo y vuelve a intentarlo.`                                                   |
| `503` `KYC_UNAVAILABLE` u otro `5xx`                 | `El servicio de verificación no está disponible en este momento. No se creó tu cuenta, así que puedes volver a intentarlo en unos minutos.` |
| Cualquier otro error                                 | `Algo salió mal de nuestro lado. Vuelve a intentarlo en unos minutos.`                                                                      |

Tras un error la persona sigue en la pantalla de confirmación y puede reintentar o pulsar **Usar
otro documento** (vuelve al formulario conservando lo escrito). Implementación:
`src/app/core/kyc/kyc-error.ts`.

## 6. Fuera de alcance (por ahora)

Alta de personas nuevas, pagos, QR, autenticación, casos de soporte (`GET /support/cases`) y la
decisión de revisión manual (`POST /kyc/verifications/{id}/decision`). Para ver `PENDING`,
`REJECTED` o `UNAVAILABLE` desde la pantalla, cambia `settings.scenarioOverride` en
`mock-server/db.json` (ver el README).

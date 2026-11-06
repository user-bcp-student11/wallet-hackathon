# Al toque · Landing y activación (W1)

Primera pantalla de la historia de usuario:

> Como usuario que se registra en la wallet, quiero ingresar mis datos de prueba para iniciar la
> activación y conocer el resultado de mi verificación.

Aplicación Angular 22 (standalone, Signal Forms, Vitest). El contrato de la API es
[`../bcp-wallet-mock-openapi.yaml`](../bcp-wallet-mock-openapi.yaml).

> **El archivo OpenAPI no inicia ningún servidor.** Es solo la descripción del contrato. Para
> probar la pantalla necesitas un mock en ejecución en `http://127.0.0.1:8787`: el oficial del
> Wallet W1–W6 (con el procedimiento que te haya entregado su equipo) o el
> [mock local con base de datos en archivo](#mock-local-con-base-de-datos-en-archivo) de este
> proyecto.

## Qué hace la pantalla

> **Nombre comercial: «Al toque».** El nombre del proyecto, de la carpeta y del archivo del contrato
> (`bcp-wallet`) son identificadores técnicos y no se renombraron.
>
> **Demostración.** La verificación es simulada y las pantallas piden usar únicamente datos
> ficticios.

## Rutas

| Ruta          | Pantalla                                                | Protección |
| ------------- | ------------------------------------------------------- | ---------- |
| `/`           | Landing del concepto, con el acceso «Regístrate»        | Ninguna    |
| `/activacion` | «Activa tu wallet»: formulario de documento y resultado | Ninguna    |
| `**`          | Cualquier otra ruta redirige a `/`                      | —          |

La landing tiene tres accesos a `/activacion`: «Regístrate», «Ya tengo cuenta: activar mi wallet» y el
enlace «Activa tu wallet» de la tarjeta «Paga y transfiere». Detalle en
[`reglas-de-negocio/inicio-y-activacion.md`](reglas-de-negocio/inicio-y-activacion.md).

- Formulario en español, adaptable a móvil y accesible: un **selector de tipo de documento** (DNI o
  carné de extranjería, CE) y un **campo separado para el número**. La persona no escribe prefijos
  técnicos (`TEST-`, `DNI-`, `CE-`).
- **Flujo (happy path):**
  1. **Continuar** consulta la persona con `POST /persons/lookup` (tipo y número). Si existe, el
     servidor devuelve solo su `userId`; si no, responde `404 PERSON_NOT_FOUND` y la pantalla solo
     informa que no se encontró (el alta de personas nuevas no está implementada).
  2. «Encontramos tu registro» → **Activar wallet** llama a `POST /kyc/verifications` con
     `{ userId, documentType, document, scenario: "APPROVED" }`. El servidor comprueba que la
     persona exista y que el documento coincida.
  3. Se muestra el resultado `ACTIVE` y el saldo en soles de `GET /wallets/{id}`.
- Un **error de conexión, un 5xx o un 404 sin `PERSON_NOT_FOUND`** nunca se muestra como «persona
  inexistente».
- **Activación repetida:** el servidor no crea una segunda wallet: responde `200` con la existente y
  la pantalla lo avisa.
- Muestra carga en cada paso y no permite envíos simultáneos.
- Distingue con icono, color y texto una wallet **activa**, **pendiente de revisión** o
  **rechazada**, indica que la verificación es **simulada** y conserva en memoria el `id` de
  verificación y el `wallet_id` (`RegistrationSession`; no se guardan en storage).
- Errores con mensajes claros: validación (`400`/`413`), documento no coincidente (`422`), servicio
  no disponible (`503` u otro `5xx`), límite del grupo (`429`) y problemas de conexión.

Las validaciones de formato y longitud de DNI y CE **están pendientes de definir con producto**:
hoy solo se exige elegir el tipo e ingresar un número no vacío.

> **Solo datos ficticios.** No ingreses DNI, CE, nombres ni fechas de nacimiento reales: ni en la
> pantalla ni en el seed del mock. La verificación es simulada, no un KYC real. La consulta de
> persona por documento es solo para la demostración y tiene riesgo de **enumeración de usuarios**:
> en producción requiere autenticación y autorización (ver
> [`activacion-con-documento.md`](reglas-de-negocio/activacion-con-documento.md)).

Fuera de alcance por ahora: alta de personas nuevas, pagos, QR, autenticación, casos de soporte y
decisión de revisión manual. La pantalla siempre pide `scenario: "APPROVED"`; para ver los demás
escenarios usa `settings.scenarioOverride` del mock local (ver más abajo).

## Reglas de negocio

- [`reglas-de-negocio/activacion-con-documento.md`](reglas-de-negocio/activacion-con-documento.md):
  flujo, contrato (consulta de persona y activación con DNI/CE), compatibilidad con `TEST`,
  activación repetida y riesgo de enumeración de usuarios.
- [`reglas-de-negocio/documento-de-identidad.md`](reglas-de-negocio/documento-de-identidad.md):
  regla propuesta (tipo + número por separado), validaciones de DNI/CE pendientes y puntos por
  acordar con backend y producto.
- [`reglas-de-negocio/inicio-y-activacion.md`](reglas-de-negocio/inicio-y-activacion.md): rutas,
  navegación y dependencias pendientes con backend (autenticación).
- [`reglas-de-negocio/validaciones.md`](reglas-de-negocio/validaciones.md): validaciones,
  mensajes, estados de la cuenta y errores de la API.

## Mock local con base de datos en archivo

Para probar el flujo de registro y activación sin depender del servicio oficial, el proyecto trae
un mock de desarrollo en `mock-server/` (solo Node, sin dependencias). Implementa la parte **W1 ·
Registro y activación** del OpenAPI y guarda sus datos en un archivo JSON.

```bash
npm run mock         # inicia el mock en http://127.0.0.1:8787
npm start            # en otra terminal: la app ya apunta a esa URL
npm run mock:reset   # restaura la base de datos a los datos dummy iniciales
npm run mock:test    # pruebas del mock (node --test)
```

| Endpoint                                | Qué hace                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| `POST /persons/lookup`                  | Consulta una persona de prueba por tipo y número; devuelve solo `userId`              |
| `POST /kyc/verifications`               | Activa la wallet de una persona (`userId` + DNI/CE) o, por compatibilidad, con `TEST` |
| `GET /kyc/verifications/{id}`           | Consulta la verificación                                                              |
| `POST /kyc/verifications/{id}/decision` | Simula la decisión humana (`ACTIVE` o `REJECTED`)                                     |
| `GET /wallets/{id}`                     | Estado y saldos de la wallet                                                          |
| `GET /support/cases`                    | Casos de soporte (se abre uno con `MANUAL_REVIEW`)                                    |

Siguen las reglas del contrato: `APPROVED` → wallet `ACTIVE`; `MANUAL_REVIEW` → `PENDING` y caso de
soporte `OPEN`; `REJECTED` → wallet rechazada; `UNAVAILABLE` → `503 KYC_UNAVAILABLE` sin crear
nada; repetir una decisión devuelve `200` y cambiar una decisión final `409 DECISION_CONFLICT`;
cuerpo mayor a 65536 bytes → `413`; latencia con `X-Mock-Latency-Ms` o `?latency=` (0–5000 ms).
Con `userId`: persona inexistente → `404 PERSON_NOT_FOUND`, documento que no coincide →
`422 DOCUMENT_MISMATCH` y activación repetida → `200` con la verificación existente (sin segunda
wallet). **No** valida documentos reales; la forma heredada `TEST` sigue sin evitar altas
repetidas. No implementa pagos, QR, eventos, conciliación ni los controles del mock (`/control/*`).

### La base de datos: `mock-server/db.json`

- Se crea sola la primera vez a partir de `mock-server/db.seed.json` (no se versiona).
- Se **lee en cada solicitud**: puedes editarla a mano y el cambio se aplica al instante, sin
  reiniciar. Cada registro nuevo se guarda en el archivo.
- Datos dummy iniciales:

| Recurso                                      | Estado     | Para probar                                    |
| -------------------------------------------- | ---------- | ---------------------------------------------- |
| `persons`: una persona con **DNI**           | —          | consulta y activación con DNI                  |
| `persons`: una persona con **CE**            | —          | consulta y activación con carné de extranjería |
| `wallet-demo` (saldo `100000` = S/ 1000.00)  | `ACTIVE`   | wallet con fondos                              |
| `kyc-seed-active` / `wallet-seed-active`     | `ACTIVE`   | cuenta activa con saldo cero                   |
| `kyc-seed-pending` / `wallet-seed-pending`   | `PENDING`  | revisión manual (con caso `OPEN`)              |
| `kyc-seed-rejected` / `wallet-seed-rejected` | `REJECTED` | cuenta rechazada                               |

Las personas tienen `userId` (GUID), nombre, apellido, fecha de nacimiento y documento; están en
`mock-server/db.seed.json` y son **ficticias**: no ingreses ni guardes datos reales. El servidor
nunca las devuelve completas: `POST /persons/lookup` solo entrega el `userId`. Si tu `db.json` es
anterior a esta versión, el servidor completa `persons` desde el seed; para restaurar todo usa
`npm run mock:reset`.

### Probar cada resultado desde la pantalla

La pantalla siempre pide `scenario: "APPROVED"`. Para ver los otros resultados, cambia en
`db.json` el valor de `settings.scenarioOverride` (sin reiniciar el mock) y activa de nuevo:

| `scenarioOverride`   | Resultado en la pantalla                                             |
| -------------------- | -------------------------------------------------------------------- |
| `null` (por defecto) | Se respeta el `scenario` de la solicitud (`APPROVED`): wallet activa |
| `"MANUAL_REVIEW"`    | «Tu wallet de prueba está en revisión» (falta una decisión)          |
| `"REJECTED"`         | «No pudimos activar tu wallet de prueba»                             |
| `"UNAVAILABLE"`      | Alerta de servicio no disponible, sin crear la cuenta                |

Como la activación es idempotente por persona, **una persona que ya activó su wallet recibe siempre
la existente (200)**, sea cual sea el escenario. Para volver a probar con la misma persona, ejecuta
`npm run mock:reset` (o borra su verificación de `db.json`).

Para probar el servidor sin la pantalla (usa un número del seed, nunca datos reales):

```bash
curl -X POST http://127.0.0.1:8787/persons/lookup -H "content-type: application/json" \
  -d '{"documentType":"DNI","documentNumber":"<número del seed>"}'
curl -X POST http://127.0.0.1:8787/kyc/verifications -H "content-type: application/json" \
  -d '{"userId":"<userId>","documentType":"DNI","document":"<número del seed>","scenario":"APPROVED"}'
curl http://127.0.0.1:8787/support/cases
curl -X POST http://127.0.0.1:8787/kyc/verifications/kyc-seed-pending/decision \
  -H "content-type: application/json" -d '{"decision":"ACTIVE"}'
```

`scenarioOverride` es una opción de desarrollo del mock local; no existe en el contrato oficial.
La pantalla de activación aún no consulta `GET /support/cases` ni envía la decisión.

## Requisitos

- Node.js y npm.
- Angular CLI (`npm install -g @angular/cli`), o usa los scripts de `package.json` con `npm run`.

## Iniciar la aplicación

```bash
cd bcp-wallet
npm install
npm start          # ng serve → http://localhost:4200
```

Abre <http://localhost:4200> (landing). Pulsa **Regístrate** para ir a `/activacion`, elige un tipo
de documento, escribe un número ficticio y pulsa **Continuar** (con el mock activo).

Otros comandos:

```bash
npm run build      # compilación de producción en dist/bcp-wallet
npm test           # pruebas unitarias (Vitest) en modo watch
npx ng test --no-watch   # una sola ejecución
```

## Configurar la URL del mock / API

La URL base se define por ambiente en `src/environments`:

| Archivo                                       | Se usa en                     | Valor inicial           |
| --------------------------------------------- | ----------------------------- | ----------------------- |
| `src/environments/environment.development.ts` | `ng serve` (desarrollo local) | `http://127.0.0.1:8787` |
| `src/environments/environment.ts`             | `ng build` (producción)       | `http://127.0.0.1:8787` |

Para apuntar a otro servidor (por ejemplo, el mock en la nube del grupo), edita `apiBaseUrl` en el
archivo del ambiente correspondiente y reinicia `ng serve` o vuelve a compilar: es configuración de
**build**, no de ejecución. Estos archivos se incluyen en el bundle del cliente, así que no guardes
secretos en ellos.

```ts
export const environment = {
  apiBaseUrl: 'http://127.0.0.1:8787',
};
```

La URL se inyecta mediante el token `API_BASE_URL` (`src/app/core/api-base-url.ts`), por lo que las
pruebas pueden sustituirla sin tocar los archivos de ambiente.

### CORS

El navegador llama al mock desde otro origen (`localhost:4200` → `127.0.0.1:8787`). Si el mock no
responde con cabeceras CORS, la pantalla mostrará el mensaje de problema de conexión aunque el
servidor esté activo. En ese caso habilita CORS en el mock para `http://localhost:4200`.

## Estructura

```
src/app/
├── core/
│   ├── api-base-url.ts                # token con la URL base (por ambiente)
│   ├── kyc/
│   │   ├── identity-document.model.ts # tipos DNI/CE de la interfaz
│   │   ├── kyc.model.ts               # tipos del contrato (solicitud con persona, Kyc, Error)
│   │   ├── kyc-api.ts                 # POST /kyc/verifications (activateWallet)
│   │   ├── kyc-error.ts               # errores de la activación → mensajes en español
│   │   └── registration-session.ts    # id y wallet_id en memoria (signals)
│   ├── person/                        # POST /persons/lookup y su manejo de errores
│   └── wallet/                        # GET /wallets/{id}
└── features/
    ├── home/                          # ruta «/»: landing del concepto
    └── activation/                    # ruta «/activacion»: consulta, activación y resultado
reglas-de-negocio/                     # reglas, validaciones y puntos por acordar
mock-server/                           # mock local (Node): server.mjs, db.seed.json y sus pruebas
```

## Pruebas

`npm test` (frontend) cubre:

- **Formulario:** selector DNI/CE, campo de número separado, ausencia de `TEST-` en pantalla,
  validaciones, alerta y foco, indicación de simulación y accesibilidad básica.
- **Consulta de persona:** DNI y CE, persona encontrada (solo se muestra el documento ingresado), no
  encontrada, y que un error de conexión, un 503 o un 404 sin `PERSON_NOT_FOUND` **no** se muestran
  como «no existe».
- **Activación:** happy path con DNI y CE (cuerpo enviado, carga, envíos simultáneos, saldo en soles
  e IDs en memoria), activación repetida (200), documento no coincidente (422), escenarios
  pendiente y rechazado, y errores.
- **Servicios:** `KycApi`, `PersonApi`, `WalletApi` y el mapeo de errores.

`npm run mock:test` (servidor) cubre la consulta de persona, el happy path con ambos tipos de
documento, persona inexistente, documento no coincidente, activación repetida, escenarios
conservados, compatibilidad con la forma `TEST`, validaciones y la latencia simulada.

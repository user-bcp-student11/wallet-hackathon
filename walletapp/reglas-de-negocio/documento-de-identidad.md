# Regla de negocio · Documento de identidad (DNI / CE)

> **Estado: propuesta.** Las validaciones definitivas, el contrato de producción y el tratamiento
> de datos personales deben acordarse con **backend y producto**. Este documento separa lo que se
> propone, lo que hoy hace el mock y lo que está pendiente.
>
> **Usa solo datos ficticios.** No deben ingresarse DNI, CE, nombres ni fechas de nacimiento
> reales, ni en la pantalla ni en el seed del mock.

## 1. Regla propuesta

La persona que se activa:

1. **Selecciona el tipo de documento**: DNI (Documento Nacional de Identidad) o CE (carné de
   extranjería).
2. **Ingresa el número del documento en un campo separado.**
3. **No escribe prefijos técnicos**: ni `TEST-`, ni `DNI-`, ni `CE-`. La interfaz no antepone
   prefijos al número ni lo transforma.

Reglas de interfaz que se aplican hoy:

| Campo               | Regla implementada                                     | Mensaje al usuario                                                                     |
| ------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Tipo de documento   | Obligatorio: debe elegirse DNI o CE                    | `Selecciona el tipo de documento: DNI o carné de extranjería (CE).`                    |
| Número de documento | Obligatorio: no puede estar vacío ni ser solo espacios | `Ingresa el número de tu documento. En este entorno de prueba usa un número ficticio.` |

Al enviar con datos incompletos no se consulta nada: se muestra una alerta
(`Revisa los datos antes de continuar. <motivo>`), el error junto al campo y el foco pasa al primer
campo con problema.

### Validaciones de DNI y CE: pendientes de definir con producto

**No se asumió ninguna longitud ni formato** que no esté documentado, ni en la pantalla ni en el
servidor. Hasta que producto las defina, el número solo debe ser no vacío. Puntos por decidir:

| Tema                  | Pregunta para producto                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Longitud del DNI      | ¿Longitud fija o rango? ¿Se admite el dígito de verificación?                                             |
| Longitud del CE       | ¿Longitud fija o rango?                                                                                   |
| Caracteres permitidos | ¿Solo dígitos o también letras (en DNI y en CE)?                                                          |
| Normalización         | ¿Se recortan espacios, se ignoran guiones, se pasa a mayúsculas? Hoy el servidor compara de forma exacta. |
| Dígito verificador    | ¿Se valida en el cliente, en el servidor o en ambos?                                                      |
| Mensajes de error     | Texto final para formato inválido, documento ya registrado, documento no válido                           |

## 2. Qué hace hoy el mock

El contrato (`bcp-wallet-mock-openapi.yaml`, versión 0.4.0) admite ahora el documento de la
persona. El flujo completo está en [`activacion-con-documento.md`](activacion-con-documento.md):

- `POST /persons/lookup` busca una persona **ficticia del seed** por tipo y número (comparación
  exacta) y devuelve solo su `userId`.
- `POST /kyc/verifications` recibe `{ userId, documentType: DNI | CE, document, scenario }` y
  comprueba en el servidor que la persona exista y que el documento coincida con el suyo.
- El mock **no verifica identidad real**: solo compara con las personas ficticias del seed. El
  resultado depende del `scenario`.

La forma anterior (`documentType: "TEST"` con `document: "TEST-…"`) se **conserva** para clientes
existentes; esta aplicación ya no la usa. Los números del seed son ficticios y no fijan ningún
formato (el del CE es alfanumérico a propósito).

## 3. Por acordar con backend y producto

- **Contrato de producción:** nombres y valores del tipo y número de documento (¿solo DNI y CE?),
  respuestas de error por documento inválido, duplicado o no coincidente. Hoy: `404
PERSON_NOT_FOUND` y `422 DOCUMENT_MISMATCH`.
- **Validaciones** de DNI y CE (sección 1) y dónde se aplican (cliente, servidor o ambos).
- **Consulta de persona:** riesgo de enumeración de usuarios y necesidad de autenticación y
  autorización (ver `activacion-con-documento.md`, sección 5).
- **Tratamiento de datos personales:** DNI y CE son datos personales. Acordar transporte seguro,
  que no se registren en logs ni analítica, retención, enmascarado en pantalla y consentimiento.
- **Verificación real:** proveedor de identidad y qué evidencia se exige.
- **Altas repetidas:** el contrato con persona ya evita crear una segunda wallet (responde `200`);
  confirmar la regla real. La forma heredada `TEST` sigue sin evitarlas.
- **Alta de personas nuevas:** fuera de alcance por ahora.

## 4. Pruebas que respaldan esta regla

- `activation.spec.ts`: selector DNI/CE, campo de número separado, ausencia de `TEST-` en la
  pantalla, validaciones, que el número se envía tal como se escribió y que no se asume formato.
- `person-api.spec.ts`, `kyc-api.spec.ts` y `server.test.mjs`: la consulta y la activación envían
  tipo y número ficticios sin prefijos técnicos, y el servidor compara tipo y número exactos.

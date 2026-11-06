# Frontend · Wallet (W1 registro y activación)

App Angular mobile-first del change OpenSpec `add-wallet-onboarding`. Consume el contrato
`../backend/src/main/resources/openapi-wallet.yml` (tag "W1 · Registro y activación"). Las versiones
están fijadas en `../docs/architecture/adr/001-stack.md`.

## Rutas

| Ruta | Pantalla |
| --- | --- |
| `/` | Landing «Al toque». «Regístrate» y «Ya tengo cuenta» llevan al registro, porque no hay inicio de sesión. |
| `/registro` | Registro en 3 pasos, con «Paso X de 3» y la lista de pasos siempre visibles. |
| `/pagos` | Punto de entrada de pagos de bajo monto. Solo se abre con la wallet `ACTIVE` (`activeWalletGuard`); las acciones aparecen como «Próximamente» hasta que exista W2. |

## Pasos del registro

1. **Tus datos.** Se ingresa el tipo de documento (`TEST`) y el número (debe empezar con `TEST-`). Si el dato falta o es inválido, no se puede avanzar y se muestra un mensaje que indica cómo corregirlo.
2. **Verificación.** Se elige el escenario a simular y se llama a `POST /kyc/verifications`.
   - `KYC_UNAVAILABLE`: aparece «Reintentar».
   - `INVALID_REQUEST`: aparece «Corregir mis datos».
3. **Tu wallet.** Se consulta `GET /wallets/{wallet_id}` y se muestra el resultado según el estado:
   - `ACTIVE`: muestra el saldo y el botón «Ir a pagos».
   - `PENDING`: muestra «Actualizar estado».
   - `REJECTED`: muestra «Intentar de nuevo».

Los textos están en `src/app/core/i18n/messages.es-pe.ts`. El estado se guarda solo en memoria.

## Analítica (`src/app/core/analytics/`)

`OnboardingAnalytics` emite tres eventos:
- `onboarding_started`
- `step_completed` (con `step` y `stepDurationMs`)
- `flow_closed` (con `outcome`: `activated`, `pending_review`, `rejected` o `abandoned`)

Cada evento lleva `elapsedMs`, un `flowId` y la atribución `channel`, `campaign` y `ref`, que se toma de la URL de entrada.

Los eventos no contienen el documento ni los IDs de wallet.

El contrato no tiene un endpoint de analítica, así que el destino (`ANALYTICS_SINK`) hoy solo escribe en la consola en modo desarrollo. Cuando exista el endpoint basta con reemplazar ese proveedor.

## Desarrollo

```bash
npm install
npm start          # http://localhost:4200, con proxy de /kyc y /wallets a http://127.0.0.1:8787
```

El backend debe estar levantado en el puerto 8787 (`../backend`, `./mvnw spring-boot:run`, con PostgreSQL).
El proxy está en `proxy.conf.json`; el backend no necesita CORS.

## Pruebas

```bash
npm test                         # unitarias y de componente (Vitest + jsdom)
npm run build                    # build de producción con presupuestos de bundle
npx playwright install chromium  # una sola vez
npm run e2e                      # E2E Playwright en viewport Pixel 7 (backend simulado con page.route)
```

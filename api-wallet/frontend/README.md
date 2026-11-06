# Frontend · Wallet (W1 registro y activación)

App Angular mobile-first del change OpenSpec `add-wallet-onboarding`. Consume el contrato
`../backend/src/main/resources/openapi-wallet.yml` (tag "W1 · Registro y activación"). Las versiones
están fijadas en `../docs/architecture/adr/001-stack.md`.

## Flujo

`/registro`: formulario con `documentType` `TEST` (fijo), `document` (prefijo `TEST-`) y el escenario a
simular (`APPROVED`, `REJECTED`, `MANUAL_REVIEW` o `UNAVAILABLE`).

1. `POST /kyc/verifications` crea la verificación y su wallet.
2. `GET /wallets/{wallet_id}` trae el estado y los saldos (céntimos de PEN).
3. El resultado depende del estado:
   - `ACTIVE`: wallet activa.
   - `PENDING`: en revisión. «Actualizar estado» vuelve a consultar `GET /kyc/verifications/{id}`.
   - `REJECTED`: rechazada, con opción de intentar de nuevo.

Los errores `{"error": "CODE"}` se muestran en español (`src/app/core/i18n/messages.es-pe.ts`).
`KYC_UNAVAILABLE` permite reintentar. El resultado vive solo en memoria.

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

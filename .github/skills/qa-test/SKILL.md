---
name: qa-test
description: "Trazabilidad QA y pruebas funcionales para Al toque. Usa esta skill para verificar changes OpenSpec, cubrir escenarios, ejecutar suites backend/frontend/E2E y reportar defectos."
argument-hint: Change de OpenSpec a verificar o área a probar
---

# QA y pruebas funcionales

## Cuándo usarla

- Verificar que una implementación cumple los escenarios de un change OpenSpec.
- Identificar brechas de cobertura y añadir pruebas unitarias, de integración o E2E.
- Ejecutar suites de pruebas, validar un change y documentar defectos funcionales.

## Procedimiento

1. Lee el change activo: `proposal.md`, `specs/`, `design.md` y `tasks.md`. Confirma el alcance y las convenciones del proyecto antes de editar.
2. Crea o actualiza `docs/qa/<change-id>-trazabilidad.md` con una fila por `#### Scenario:`. Incluye capability, requirement, escenario, pruebas (ruta y nombre), nivel y estado (`✅`, `❌` o `sin cubrir`).
3. Para cada escenario, vincula una prueba existente o escribe la prueba faltante en el directorio correspondiente. Usa datos sintéticos y valores expresamente definidos por las specs.
4. Ejecuta las comprobaciones pertinentes:
   - Backend: `cd backend && ./mvnw verify`
   - Frontend: `cd frontend && ng test` y `ng build`
   - E2E: `npx playwright test` en viewport móvil
   - Specs: `openspec validate <change-id> --strict`
5. Registra resultados reales. Para cada defecto incluye escenario, pasos de reproducción, resultado esperado y obtenido, severidad y evidencia. No marques escenarios como aprobados si la prueba no se ejecutó o falló.
6. Marca la verificación integral en `tasks.md` únicamente cuando todos los escenarios estén en ✅.

## Escenarios importantes de la épica de onboarding

- Idempotencia: reenvío con la misma `Idempotency-Key`, confirmaciones repetidas y recargas que no duplican `onboarding_started`.
- Privacidad funcional: las specs prohíben DNI, nombres, celular, correo, OTP o valores de formulario en eventos o logs; conserva las pruebas de regresión para esos requisitos.
- Validación del servidor con datos que el cliente habría bloqueado; bordes de DNI, celular, CE, edad y montos PEN definidos por las specs.
- Abandono con reloj simulado y agrupación mensual en `America/Lima`, incluidos límites de mes.
- Mes sin activaciones, valores CAC/MAU definidos por las specs y prevención de división por cero.
- UX y accesibilidad especificadas, incluido el paso actual, el foco en el primer error y la conservación de datos después de un error.

## Límites

- Edita solo código de test (`backend/src/test/`, `frontend/**/*.spec.ts`, `e2e/`) y `docs/qa/`; no corrijas código de producción.
- Si una spec es ambigua, repórtalo a `product-owner`; no inventes comportamiento esperado.
- Usa datos sintéticos y entornos locales/de test o expresamente autorizados.
- Esta skill no sustituye una revisión de seguridad. Si aparece un posible riesgo, registra evidencia inicial y deriva la evaluación a `security-review`.

# ADR 001 - Stack tecnológico

- Estado: aceptado
- Cambio: `add-wallet-onboarding`

## Contexto

El cambio `add-wallet-onboarding` crea el backend (módulos `onboarding` y `wallet`, monolito modular con arquitectura hexagonal) y el frontend Angular mobile-first. Este documento fija las versiones exactas con las que se construyó y verificó el cambio.

## Decisión

### Backend (`backend/`)

| Componente | Versión |
| --- | --- |
| Java (Temurin, LTS) | 21.0.12.1 |
| Spring Boot | 3.5.16 |
| Maven (vía `./mvnw`) | 3.10.0 |
| PostgreSQL | 17 (imagen `postgres:17-alpine`) |
| Controlador JDBC PostgreSQL | 42.7.11 |
| Flyway | 11.7.2 |

### Frontend (`frontend/`)

| Componente | Versión |
| --- | --- |
| Node.js | 26.9.0 |
| npm | 11.19.1 |
| Angular (framework) | 22.2.4 |
| Angular CLI | 22.2.6 |
| TypeScript | 6.0.3 |
| RxJS | 7.8.2 |

### Herramientas de prueba

| Herramienta | Versión | Uso |
| --- | --- | --- |
| JUnit Jupiter | 5.12.2 | Pruebas unitarias e integración del backend |
| AssertJ | 3.27.7 | Aserciones del backend |
| Mockito | 5.17.0 | Disponible por `spring-boot-starter-test`; las pruebas de aplicación usan fakes |
| Testcontainers | 1.21.4 | PostgreSQL real en pruebas de integración |
| ArchUnit | 1.5.1 | Reglas de arquitectura hexagonal |
| Vitest | 4.1.12 | Pruebas unitarias del frontend (`ng test`) |
| jsdom | 28.1.0 | Entorno DOM de las pruebas del frontend |
| Playwright | 1.65.0 | E2E en viewport móvil (Chromium, perfil Pixel 7) |
| Redocly CLI | última disponible al validar | Validación de `openapi.yaml` |

## Consecuencias

- Cambiar una versión mayor requiere actualizar este documento en el mismo cambio.
- Spring Boot permanece en 3.x según el diseño; el frontend usa las versiones vigentes de Angular.
- Las pruebas de integración del backend requieren Docker disponible para Testcontainers.
- El E2E de Playwright simula el backend con el contrato de `openapi.yaml`; no requiere backend ni base de datos.

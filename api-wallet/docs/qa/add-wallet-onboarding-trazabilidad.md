# Trazabilidad: W1 · Registro y activación (KYC simulado)

Fuente de verdad: [`openapi-wallet.yml`](../../backend/src/main/resources/openapi-wallet.yml), tag **W1 · Registro y activación** (`/kyc/verifications`, `/kyc/verifications/{id}`, `/kyc/verifications/{id}/decision`, `/wallets/{id}`).

Verificado con `./mvnw clean verify` (54 pruebas unitarias + 31 de integración con PostgreSQL en Testcontainers).

Leyenda: **U** = unitaria, **IT** = integración (`backend/src/test/java/com/wallet/...`).

## Comportamientos del contrato

| # | Operación | Comportamiento | Pruebas | Estado |
| --- | --- | --- | --- | --- |
| 1 | `POST /kyc/verifications` | `APPROVED` crea wallet `ACTIVE` con saldo cero (201) | U `KycUseCasesTest.approvedCreatesAnActiveWallet`, IT `KycApiIT.approvedCreatesAnActiveWalletWithZeroBalance` | Cubierto, en verde |
| 2 | `POST /kyc/verifications` | `scenario` ausente equivale a `APPROVED` | U `KycDomainTest`, U `KycUseCasesTest.defaultScenarioIsApproved`, IT `KycApiIT.defaultScenarioIsApproved` | Cubierto, en verde |
| 3 | `POST /kyc/verifications` | `REJECTED` crea cuenta rechazada | U `KycUseCasesTest.rejectedCreatesARejectedWallet`, IT `KycApiIT.rejectedCreatesARejectedAccount` | Cubierto, en verde |
| 4 | `POST /kyc/verifications` | `MANUAL_REVIEW` deja `PENDING` y abre caso de soporte | U `KycUseCasesTest.manualReviewLeavesTheAccountPendingAndOpensASupportCase`, IT `KycApiIT.manualReviewLeavesTheAccountPendingAndOpensASupportCase` | Cubierto, en verde |
| 5 | `POST /kyc/verifications` | `UNAVAILABLE` devuelve 503 `KYC_UNAVAILABLE` y no crea wallet | U `KycUseCasesTest.unavailableCreatesNothing`, IT `KycApiIT.unavailableReturns503AndCreatesNothing` | Cubierto, en verde |
| 6 | `POST /kyc/verifications` | Solo `documentType` `TEST` y `document` con prefijo `TEST-`; entrada inválida devuelve 400 | U `KycDomainTest`, IT `KycApiIT.invalidInputReturns400AndCreatesNothing` | Cubierto, en verde |
| 7 | `POST /kyc/verifications` | No evita altas repetidas | U `KycUseCasesTest.repeatedRegistrationsCreateIndependentAccounts`, IT `KycApiIT.repeatedRegistrationsAreNotPrevented` | Cubierto, en verde |
| 8 | Todas | Cuerpo mayor a 65536 bytes devuelve 413 | IT `KycApiIT.oversizedBodyReturns413` | Cubierto, en verde |
| 9 | `GET /kyc/verifications/{id}` | Devuelve la verificación por su ID kyc (200) | U `KycUseCasesTest.existingVerificationIsReturned`, IT `KycApiIT.verificationIsFoundByItsKycId` | Cubierto, en verde |
| 10 | `GET /kyc/verifications/{id}` | ID inexistente, o `wallet_id` usado como ID kyc, devuelve 404 `NOT_FOUND` | IT `KycApiIT.walletIdIsNotAKycId` | Cubierto, en verde |
| 11 | `POST /kyc/verifications/{id}/decision` | `ACTIVE` activa la wallet y resuelve el caso de soporte | U `KycUseCasesTest.activeDecisionActivatesTheWalletAndResolvesTheCase`, IT `KycApiIT.activeDecisionActivatesTheWalletAndResolvesTheSupportCase` | Cubierto, en verde |
| 12 | `POST /kyc/verifications/{id}/decision` | `REJECTED` rechaza la wallet y resuelve el caso | U `KycUseCasesTest.rejectedDecisionRejectsTheWalletAndResolvesTheCase`, IT `KycApiIT.rejectedDecisionRejectsTheWalletAndResolvesTheSupportCase` | Cubierto, en verde |
| 13 | `POST /kyc/verifications/{id}/decision` | Repetir la misma decisión devuelve 200 | U `KycDomainTest`, U `KycUseCasesTest.repeatedDecisionKeepsTheResult`, IT `KycApiIT.repeatingTheSameDecisionReturns200` | Cubierto, en verde |
| 14 | `POST /kyc/verifications/{id}/decision` | Cambiar una decisión final devuelve 409 `DECISION_CONFLICT` | U `KycUseCasesTest.changingAFinalDecisionIsRejectedAndKeepsTheState`, IT `KycApiIT.changingAFinalDecisionReturns409`, IT `KycApiIT.contradictingAnAutomaticallyResolvedAccountReturns409` | Cubierto, en verde |
| 15 | `POST /kyc/verifications/{id}/decision` | Decisión inválida devuelve 400 `INVALID_DECISION` | U `KycDomainTest.decisionMustBeActiveOrRejected`, IT `KycApiIT.invalidDecisionReturns400` | Cubierto, en verde |
| 16 | `POST /kyc/verifications/{id}/decision` | Verificación inexistente devuelve 404 | U `KycUseCasesTest`, IT `KycApiIT.decisionOnAnUnknownVerificationReturns404` | Cubierto, en verde |
| 17 | `POST /kyc/verifications/{id}/decision` | Decisiones simultáneas contrarias dejan un único resultado final | IT `KycDecisionConcurrencyIT` (falla si se quita el bloqueo de fila) | Cubierto, en verde |
| 18 | `GET /wallets/{id}` | Estado y saldos en céntimos; `available = balance - reserved` | U `WalletTest`, IT `WalletApiIT.availableIsBalanceMinusReserved` | Cubierto, en verde |
| 19 | `GET /wallets/{id}` | `wallet-demo` empieza `ACTIVE` con 100000 | IT `WalletApiIT.walletDemoIsPreloadedWithFunds`, IT `FlywayMigrationsIT.walletDemoIsSeeded` | Cubierto, en verde |
| 20 | `GET /wallets/{id}` | Wallet inexistente devuelve 404 `NOT_FOUND` | IT `WalletApiIT.unknownWalletReturns404` | Cubierto, en verde |
| 21 | Todas | `X-Mock-Latency-Ms` / `latency` (0 a 5000 ms, header con prioridad), también en errores | U `MockLatencyTest`, IT `MockLatencyIT` | Cubierto, en verde |
| 22 | Todas | Latencia inválida devuelve 400 `INVALID_MOCK_LATENCY` antes de ejecutar la operación | U `MockLatencyTest`, IT `MockLatencyIT.invalidLatencyIsRejectedBeforeTheOperation` | Cubierto, en verde |

## Transversal

| Verificación | Pruebas | Estado |
| --- | --- | --- |
| `domain` sin Spring ni adaptadores/aplicación; `onboarding` y `wallet` aislados entre sí | `HexagonalArchitectureTest` (ArchUnit) | En verde |
| Migraciones Flyway limpias sobre PostgreSQL | `FlywayMigrationsIT` | En verde |
| El documento enviado no aparece en los registros | `LogPrivacyIT`, `MaskingMessageConverterTest` | En verde |

## No cubierto por el contrato
- `429 GROUP_LIMIT_RESET_REQUIRED`: el contrato lo marca "solo cloud".
- `GET /support/cases` pertenece al tag W5; este cambio solo abre y resuelve el caso (tabla `support_cases`).
- `reserved` siempre es 0 hasta que existan pagos `PENDING` (W2).
- Los escenarios de `specs/wallet-onboarding/spec.md` sobre pasos, OTP y abandono por inactividad ya no aplican con este contrato (ver nota de divergencia en el resumen del cambio).

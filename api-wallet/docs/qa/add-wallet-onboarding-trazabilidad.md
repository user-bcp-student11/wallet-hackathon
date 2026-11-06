# Trazabilidad: add-wallet-onboarding

Una fila por escenario de [`spec.md`](../../../openspec/changes/add-wallet-onboarding/specs/wallet-onboarding/spec.md) y las pruebas que lo verifican.
Estado verificado con `./mvnw verify` (39 unitarias + 30 de integración), `ng test` (27), `npx playwright test` (3) y `openspec validate add-wallet-onboarding --strict`.

Leyenda: **BE** = backend (`backend/src/test/java/com/wallet/...`), **FE** = frontend (`frontend/src/app/...`), **E2E** = `frontend/e2e/onboarding.spec.ts`.

| # | Requisito | Escenario | Pruebas | Estado |
| --- | --- | --- | --- | --- |
| 1 | Definición de pasos provista por el servidor | Secuencia por defecto | BE `OnboardingTest.newOnboardingStartsAtFirstStep`, BE `OnboardingApiIT.newOnboardingExposesTheConfiguredSteps` | Cubierto, en verde |
| 2 | Definición de pasos provista por el servidor | Cambio de configuración | BE `OnboardingTest.currentStepFollowsTheConfiguredSequence`, FE `step-progress.component.spec` | Cubierto, en verde |
| 3 | Progreso y siguiente paso visibles | Paso intermedio | FE `step-progress.component.spec`, BE `OnboardingApiIT.progressAfterTheFirstStepShowsItAsCompleted` | Cubierto, en verde |
| 4 | Progreso y siguiente paso visibles | Último paso | FE `step-progress.component.spec`, FE `step-forms.spec` (Último paso), E2E recorrido completo | Cubierto, en verde |
| 5 | Inicio idempotente del onboarding | Recarga durante el onboarding | BE `SubmitStepUseCaseTest.startingAgainReturnsTheSameInProgressOnboarding`, BE `OnboardingApiIT.startingAgainReturnsTheSameOnboarding` | Cubierto, en verde |
| 6 | Inicio idempotente del onboarding | Inicio repetido con la misma clave | BE `IdempotencyIT.sameKeyOnStartReturnsTheSameResponse` | Cubierto, en verde |
| 7 | Orden estricto de los pasos | Salto de paso | BE `OnboardingTest.submittingALaterStepIsRejectedWithTheCurrentStep`, BE `SubmitStepUseCaseTest.submittingALaterStepIsRejectedWithTheCurrentStep`, BE `OnboardingApiIT.skippingAStepIsRejectedAndTheCurrentStepIsReported` | Cubierto, en verde |
| 8 | Bloqueo del avance ante datos faltantes o inválidos | Campo obligatorio vacío | BE `SubmitStepUseCaseTest.emptyRequiredFieldBlocksTheStep`, BE `OnboardingApiIT.missingRequiredFieldIsListedWithAnActionableMessage`, FE `step-forms.spec` | Cubierto, en verde |
| 9 | Bloqueo del avance ante datos faltantes o inválidos | Varios campos inválidos | BE `SubmitStepUseCaseTest.everyInvalidFieldGetsItsOwnError`, BE `OnboardingApiIT.everyInvalidFieldIsReported`, FE `step-forms.spec` (incluye mapeo de errores del servidor y valores conservados) | Cubierto, en verde |
| 10 | Bloqueo del avance ante datos faltantes o inválidos | Validación local insuficiente | BE `SubmitStepUseCaseTest.serverAppliesItsOwnRulesRegardlessOfClientValidation`, BE `OnboardingApiIT.serverRejectsDataTheClientShouldHaveBlocked` | Cubierto, en verde |
| 11 | Reglas de validación de datos del usuario | Celular con formato inválido | BE `PeruRulesTest.phoneStartingWithEightIsRejected`, FE `step-forms.spec` (Celular con formato inválido), E2E validación local | Cubierto, en verde |
| 12 | Reglas de validación de datos del usuario | DNI con longitud incorrecta | BE `PeruRulesTest.dniWithWrongLengthIsRejected` (7 y 9 dígitos), BE `OnboardingApiIT.everyInvalidFieldIsReported` | Cubierto, en verde |
| 13 | Reglas de validación de datos del usuario | Usuario menor de edad | BE `PeruRulesTest.minorIsRejected`, BE `OnboardingApiIT.everyInvalidFieldIsReported` | Cubierto, en verde |
| 14 | Reglas de validación de datos del usuario | Documento CE válido | BE `PeruRulesTest.validCeIsAccepted`, BE `OnboardingApiIT.ceDocumentIsAccepted`, FE `step-forms.spec` (Número CE) | Cubierto, en verde |
| 15 | Verificación del celular con OTP | Código correcto | BE `SubmitStepUseCaseTest.correctOtpCompletesThePhoneStep`, BE `OnboardingApiIT.configuredFakeOtpCodeIsAccepted` | Cubierto, en verde |
| 16 | Verificación del celular con OTP | Código incorrecto | BE `SubmitStepUseCaseTest.wrongOtpKeepsTheUserInThePhoneStep`, BE `OnboardingApiIT.wrongOtpIsRejectedWithARetryMessage`, E2E error recuperable | Cubierto, en verde |
| 17 | Verificación del celular con OTP | Proveedor simulado | BE `SubmitStepUseCaseTest.fakeProviderAcceptsTheConfiguredFixedCode` | Cubierto, en verde |
| 18 | Abandono por inactividad | Inactividad prolongada | BE `SubmitStepUseCaseTest.inactiveOnboardingBecomesAbandoned`, BE `JdbcOnboardingRepositoryIT.abandonOnlyAffectsInProgressOnboardingsInactiveBeforeTheCutoff` | Cubierto, en verde |
| 19 | Abandono por inactividad | Actividad dentro del plazo | BE `SubmitStepUseCaseTest.advancingAStepBeforeTheDeadlineResetsInactivity` | Cubierto, en verde |
| 20 | Abandono por inactividad | Continuar un onboarding abandonado | BE `OnboardingTest.abandonedOnboardingCannotAdvance`, BE `SubmitStepUseCaseTest.abandonedOnboardingCannotBeContinuedAndAllowsANewOne`, BE `OnboardingApiIT.abandonedOnboardingCannotBeContinued` | Cubierto, en verde |
| 21 | Activación de la wallet al completar el onboarding | Onboarding completado | BE `SubmitStepUseCaseTest.lastStepCompletesTheOnboardingAndActivatesTheWallet`, BE `WalletApiIT.completingTheLastStepActivatesTheWalletAndCompletesTheOnboarding`, FE `activation.component.spec`, E2E recorrido completo | Cubierto, en verde |
| 22 | Activación de la wallet al completar el onboarding | Onboarding incompleto | BE `SubmitStepUseCaseTest.walletIsNotActivatedBeforeTheLastStep`, BE `WalletApiIT.incompleteOnboardingDoesNotActivateTheWallet` | Cubierto, en verde |
| 23 | Confirmación idempotente de la activación | Confirmación repetida | BE `IdempotencyIT.sameKeyOnConfirmationReturnsTheSameResponseAndActivatesOnce` | Cubierto, en verde |
| 24 | Confirmación idempotente de la activación | Confirmación tras completar | BE `SubmitStepUseCaseTest.confirmingACompletedOnboardingReturnsTheActiveWalletWithoutSideEffects`, BE `WalletApiIT.confirmingACompletedOnboardingReturnsTheActiveWallet` | Cubierto, en verde |
| 25 | Consulta del estado de la wallet y acceso a pagos | Wallet activa | BE `WalletApiIT.activeWalletEnablesThePaymentsEntryPoint`, FE `payments-access.guard.spec`, FE `activation.component.spec` | Cubierto, en verde |
| 26 | Consulta del estado de la wallet y acceso a pagos | Wallet no activa | BE `WalletApiIT.userWithoutActiveWalletIsDeniedWithAnActionableMessage`, FE `payments-access.guard.spec`, FE `activation.component.spec` | Cubierto, en verde |
| 27 | Consulta del estado de la wallet y acceso a pagos | Usuario con onboarding en curso | BE `WalletApiIT.walletStatusReportsTheOnboardingInProgressAndItsCurrentStep` | Cubierto, en verde |
| 28 | Datos personales fuera de los registros | Registro de errores de validación | BE `LogPrivacyIT.rejectedValuesNeverAppearInLogs`, BE `MaskingMessageConverterTest` | Cubierto, en verde |

## Verificaciones transversales

| Tarea | Verificación | Estado |
| --- | --- | --- |
| 1.3 | `HexagonalArchitectureTest` (ArchUnit): `domain` sin Spring ni adaptadores | En verde |
| 2.4 / 3.1 / 3.2 | `FlywayMigrationsIT`, `JdbcOnboardingRepositoryIT` (concurrencia) con PostgreSQL en Testcontainers | En verde |
| 5.1 | FE `idempotency-key.interceptor.spec` (UUID por intento, reutilizado en reintentos) | En verde |
| 5.4 | FE `accessibility.spec` (etiquetas, `aria-describedby`, foco al primer error, 44 px, textos es-PE) | En verde |
| 1.5 | `npx @redocly/cli lint docs/architecture/openapi.yaml` | Válido |

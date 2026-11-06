package com.wallet.onboarding.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wallet.onboarding.adapters.out.provider.FakeIdentityValidation;
import com.wallet.onboarding.adapters.out.provider.FakeOtpProvider;
import com.wallet.onboarding.application.StartOnboardingUseCase.StartResult;
import com.wallet.onboarding.application.SubmitStepUseCase.SubmitStepCommand;
import com.wallet.onboarding.application.step.ConfirmationStepHandler;
import com.wallet.onboarding.application.step.IdentityStepHandler;
import com.wallet.onboarding.application.step.PhoneStepHandler;
import com.wallet.onboarding.config.OnboardingProperties;
import com.wallet.onboarding.config.OnboardingProperties.Otp;
import com.wallet.onboarding.domain.FieldError;
import com.wallet.onboarding.domain.OnboardingId;
import com.wallet.onboarding.domain.OnboardingNotInProgressException;
import com.wallet.onboarding.domain.OnboardingStatus;
import com.wallet.onboarding.domain.StepOutOfOrderException;
import com.wallet.onboarding.domain.ValidationFailedException;
import com.wallet.shared.domain.UserId;
import com.wallet.support.Fixtures;
import com.wallet.support.InMemoryOnboardingRepository;
import com.wallet.support.MutableClock;
import com.wallet.support.SpyWalletActivation;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SubmitStepUseCaseTest {

    private static final String FIXED_OTP = "654321";

    private final UserId userId = UserId.of(UUID.randomUUID());
    private final MutableClock clock = new MutableClock(Instant.parse("2026-11-06T10:00:00Z"));
    private InMemoryOnboardingRepository repository;
    private SpyWalletActivation walletActivation;
    private StartOnboardingUseCase start;
    private SubmitStepUseCase submit;
    private AbandonInactiveOnboardingsUseCase abandon;

    @BeforeEach
    void setUp() {
        repository = new InMemoryOnboardingRepository();
        walletActivation = new SpyWalletActivation();
        FakeOtpProvider otp = new FakeOtpProvider(
                new OnboardingProperties(List.of(), 24, Duration.ofMinutes(5), new Otp(FIXED_OTP)));
        start = new StartOnboardingUseCase(repository, Fixtures.DEFAULT_SEQUENCE, clock);
        submit = new SubmitStepUseCase(repository, walletActivation, Fixtures.DEFAULT_SEQUENCE,
                List.of(new PhoneStepHandler(otp),
                        new IdentityStepHandler(new FakeIdentityValidation(), clock),
                        new ConfirmationStepHandler()),
                clock);
        abandon = new AbandonInactiveOnboardingsUseCase(repository, new AbandonPolicy(Duration.ofHours(24)), clock);
    }

    private OnboardingId startOnboarding() {
        StartResult result = start.execute(userId);
        return OnboardingId.of(result.onboarding().id());
    }

    private OnboardingView submit(OnboardingId id, String step, Map<String, String> values) {
        return submit.execute(new SubmitStepCommand(id, userId, step, values));
    }

    private OnboardingId onboardingAtIdentityStep() {
        OnboardingId id = startOnboarding();
        submit(id, "phone", Map.of("phoneNumber", "912345678", "otpCode", FIXED_OTP));
        return id;
    }

    private List<FieldError> rejectedErrors(OnboardingId id, String step, Map<String, String> values) {
        try {
            submit(id, step, values);
        } catch (ValidationFailedException e) {
            return e.errors();
        }
        throw new AssertionError("Se esperaba un rechazo por validación");
    }

    @Test
    @DisplayName("Scenario: Campo obligatorio vacío")
    void emptyRequiredFieldBlocksTheStep() {
        OnboardingId id = onboardingAtIdentityStep();
        Map<String, String> values = new HashMap<>(Fixtures.validIdentityStep());
        values.remove("firstName");

        assertThat(rejectedErrors(id, "identity", values))
                .containsExactly(new FieldError("firstName", "Ingresa tus nombres."));
        assertThat(repository.get(id).completedSteps()).hasSize(1);
    }

    @Test
    @DisplayName("Scenario: Varios campos inválidos")
    void everyInvalidFieldGetsItsOwnError() {
        OnboardingId id = onboardingAtIdentityStep();
        Map<String, String> values = new HashMap<>(Fixtures.validIdentityStep());
        values.put("documentNumber", "1234567");
        values.put("birthDate", "2015-01-01");

        assertThat(rejectedErrors(id, "identity", values)).extracting(FieldError::field)
                .containsExactly("documentNumber", "birthDate");
    }

    @Test
    @DisplayName("Scenario: Validación local insuficiente")
    void serverAppliesItsOwnRulesRegardlessOfClientValidation() {
        OnboardingId id = startOnboarding();

        assertThat(rejectedErrors(id, "phone", Map.of("phoneNumber", "812345678", "otpCode", FIXED_OTP)))
                .containsExactly(new FieldError("phoneNumber", "El celular debe empezar con 9."));
    }

    @Test
    @DisplayName("Scenario: Código correcto")
    void correctOtpCompletesThePhoneStep() {
        OnboardingId id = startOnboarding();

        OnboardingView view = submit(id, "phone", Map.of("phoneNumber", "912345678", "otpCode", FIXED_OTP));

        assertThat(view.currentStep()).isEqualTo("identity");
        assertThat(view.stepNumber()).isEqualTo(2);
    }

    @Test
    @DisplayName("Scenario: Código incorrecto")
    void wrongOtpKeepsTheUserInThePhoneStep() {
        OnboardingId id = startOnboarding();

        assertThat(rejectedErrors(id, "phone", Map.of("phoneNumber", "912345678", "otpCode", "000000")))
                .containsExactly(new FieldError("otpCode", "El código es incorrecto. Revísalo e inténtalo de nuevo."));
        assertThat(repository.get(id).completedSteps()).isEmpty();
    }

    @Test
    @DisplayName("Scenario: Proveedor simulado")
    void fakeProviderAcceptsTheConfiguredFixedCode() {
        FakeOtpProvider otp = new FakeOtpProvider(
                new OnboardingProperties(List.of(), 24, Duration.ofMinutes(5), new Otp("999000")));

        assertThat(otp.verify("912345678", "999000")).isTrue();
        assertThat(otp.verify("912345678", FIXED_OTP)).isFalse();
    }

    @Test
    @DisplayName("Scenario: Salto de paso")
    void submittingALaterStepIsRejectedWithTheCurrentStep() {
        OnboardingId id = startOnboarding();

        assertThatThrownBy(() -> submit(id, "confirmation", Fixtures.validConfirmationStep()))
                .isInstanceOfSatisfying(StepOutOfOrderException.class,
                        e -> assertThat(e.currentStep().code()).isEqualTo("phone"));
    }

    @Test
    @DisplayName("Scenario: Onboarding incompleto")
    void walletIsNotActivatedBeforeTheLastStep() {
        OnboardingId id = onboardingAtIdentityStep();
        submit(id, "identity", Fixtures.validIdentityStep());

        assertThat(repository.get(id).status()).isEqualTo(OnboardingStatus.IN_PROGRESS);
        assertThat(walletActivation.activated()).isEmpty();
    }

    @Test
    @DisplayName("Scenario: Onboarding completado")
    void lastStepCompletesTheOnboardingAndActivatesTheWallet() {
        OnboardingId id = onboardingAtIdentityStep();
        submit(id, "identity", Fixtures.validIdentityStep());

        OnboardingView view = submit(id, "confirmation", Fixtures.validConfirmationStep());

        assertThat(view.status()).isEqualTo(OnboardingStatus.COMPLETED);
        assertThat(view.walletActive()).isTrue();
        assertThat(walletActivation.activated()).containsExactly(userId);
    }

    @Test
    @DisplayName("Scenario: Confirmación tras completar")
    void confirmingACompletedOnboardingReturnsTheActiveWalletWithoutSideEffects() {
        OnboardingId id = onboardingAtIdentityStep();
        submit(id, "identity", Fixtures.validIdentityStep());
        OnboardingView first = submit(id, "confirmation", Fixtures.validConfirmationStep());

        OnboardingView repeated = submit(id, "confirmation", Fixtures.validConfirmationStep());

        assertThat(repeated).isEqualTo(first);
        assertThat(walletActivation.activated()).hasSize(1);
    }

    @Test
    @DisplayName("Scenario: Recarga durante el onboarding")
    void startingAgainReturnsTheSameInProgressOnboarding() {
        StartResult first = start.execute(userId);

        StartResult reload = start.execute(userId);

        assertThat(first.created()).isTrue();
        assertThat(reload.created()).isFalse();
        assertThat(reload.onboarding().id()).isEqualTo(first.onboarding().id());
    }

    @Test
    @DisplayName("Scenario: Actividad dentro del plazo")
    void advancingAStepBeforeTheDeadlineResetsInactivity() {
        OnboardingId id = startOnboarding();
        clock.advance(Duration.ofHours(23));
        submit(id, "phone", Map.of("phoneNumber", "912345678", "otpCode", FIXED_OTP));
        clock.advance(Duration.ofHours(23));

        assertThat(abandon.execute()).isZero();
        assertThat(repository.get(id).status()).isEqualTo(OnboardingStatus.IN_PROGRESS);
    }

    @Test
    @DisplayName("Scenario: Inactividad prolongada")
    void inactiveOnboardingBecomesAbandoned() {
        OnboardingId id = startOnboarding();
        clock.advance(Duration.ofHours(25));

        assertThat(abandon.execute()).isEqualTo(1);
        assertThat(repository.get(id).status()).isEqualTo(OnboardingStatus.ABANDONED);
    }

    @Test
    @DisplayName("Scenario: Continuar un onboarding abandonado")
    void abandonedOnboardingCannotBeContinuedAndAllowsANewOne() {
        OnboardingId id = startOnboarding();
        clock.advance(Duration.ofHours(25));
        abandon.execute();

        assertThatThrownBy(() -> submit(id, "phone", Fixtures.validPhoneStep()))
                .isInstanceOfSatisfying(OnboardingNotInProgressException.class,
                        e -> assertThat(e.status()).isEqualTo(OnboardingStatus.ABANDONED));
        assertThat(start.execute(userId).onboarding().id()).isNotEqualTo(id.value());
    }
}

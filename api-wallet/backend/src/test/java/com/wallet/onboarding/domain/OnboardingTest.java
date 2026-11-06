package com.wallet.onboarding.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wallet.shared.domain.UserId;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class OnboardingTest {

    private static final Instant NOW = Instant.parse("2026-11-06T10:00:00Z");
    private static final Instant LATER = NOW.plusSeconds(60);

    private static final StepSequence DEFAULT_SEQUENCE = new StepSequence(List.of(
            new StepDefinition(StepType.PHONE, "Celular", "Verifica tu celular"),
            new StepDefinition(StepType.IDENTITY, "Datos", "Ingresa tus datos"),
            new StepDefinition(StepType.CONFIRMATION, "Confirmación", "Confirma")));

    private Onboarding newOnboarding() {
        return Onboarding.start(OnboardingId.newId(), UserId.of(UUID.randomUUID()), NOW);
    }

    @Test
    @DisplayName("Scenario: Secuencia por defecto")
    void newOnboardingStartsAtFirstStep() {
        Onboarding onboarding = newOnboarding();

        assertThat(onboarding.status()).isEqualTo(OnboardingStatus.IN_PROGRESS);
        assertThat(onboarding.currentStep(DEFAULT_SEQUENCE)).map(StepDefinition::type).contains(StepType.PHONE);
        assertThat(onboarding.completedSteps()).isEmpty();
    }

    @Test
    @DisplayName("Scenario: Cambio de configuración")
    void currentStepFollowsTheConfiguredSequence() {
        StepSequence customSequence = new StepSequence(List.of(
                new StepDefinition(StepType.IDENTITY, "Datos", "Ingresa tus datos"),
                new StepDefinition(StepType.CONFIRMATION, "Confirmación", "Confirma")));

        Onboarding onboarding = newOnboarding();

        assertThat(onboarding.currentStep(customSequence)).map(StepDefinition::type).contains(StepType.IDENTITY);
        assertThat(customSequence.size()).isEqualTo(2);
    }

    @Test
    @DisplayName("Scenario: Salto de paso")
    void submittingALaterStepIsRejectedWithTheCurrentStep() {
        Onboarding onboarding = newOnboarding();

        assertThatThrownBy(() -> onboarding.completeStep("confirmation", DEFAULT_SEQUENCE, LATER))
                .isInstanceOfSatisfying(StepOutOfOrderException.class,
                        e -> assertThat(e.currentStep()).isEqualTo(StepType.PHONE));
    }

    @Test
    @DisplayName("Scenario: Paso ya completado")
    void submittingAnAlreadyCompletedStepIsRejected() {
        Onboarding afterPhone = newOnboarding().completeStep("phone", DEFAULT_SEQUENCE, LATER);

        assertThatThrownBy(() -> afterPhone.completeStep("phone", DEFAULT_SEQUENCE, LATER))
                .isInstanceOfSatisfying(StepOutOfOrderException.class,
                        e -> assertThat(e.currentStep()).isEqualTo(StepType.IDENTITY));
    }

    @Test
    @DisplayName("Scenario: Avance en orden hasta completar")
    void completingEveryStepInOrderCompletesTheOnboarding() {
        Onboarding onboarding = newOnboarding()
                .completeStep("phone", DEFAULT_SEQUENCE, LATER)
                .completeStep("identity", DEFAULT_SEQUENCE, LATER);

        assertThat(onboarding.status()).isEqualTo(OnboardingStatus.IN_PROGRESS);

        Onboarding completed = onboarding.completeStep("confirmation", DEFAULT_SEQUENCE, LATER);

        assertThat(completed.status()).isEqualTo(OnboardingStatus.COMPLETED);
        assertThat(completed.lastActivityAt()).isEqualTo(LATER);
        assertThat(completed.isFinalConfirmationRepeat("confirmation", DEFAULT_SEQUENCE)).isTrue();
    }

    @Test
    @DisplayName("Scenario: Continuar un onboarding abandonado")
    void abandonedOnboardingCannotAdvance() {
        Onboarding abandoned = new Onboarding(OnboardingId.newId(), UserId.of(UUID.randomUUID()),
                OnboardingStatus.ABANDONED, java.util.Set.of(), NOW, 0);

        assertThatThrownBy(() -> abandoned.completeStep("phone", DEFAULT_SEQUENCE, LATER))
                .isInstanceOfSatisfying(OnboardingNotInProgressException.class,
                        e -> assertThat(e.status()).isEqualTo(OnboardingStatus.ABANDONED));
    }

    @Test
    @DisplayName("Scenario: Secuencia inválida")
    void sequenceRejectsEmptyAndRepeatedSteps() {
        assertThatThrownBy(() -> new StepSequence(List.of())).isInstanceOf(IllegalArgumentException.class);
        StepDefinition phone = new StepDefinition(StepType.PHONE, "Celular", "x");
        assertThatThrownBy(() -> new StepSequence(List.of(phone, phone))).isInstanceOf(IllegalArgumentException.class);
    }
}

package com.wallet.onboarding.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wallet.shared.domain.WalletId;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class KycDomainTest {

    private final WalletId walletId = WalletId.newId();

    @ParameterizedTest
    @CsvSource({"APPROVED,ACTIVE", "REJECTED,REJECTED", "MANUAL_REVIEW,PENDING"})
    @DisplayName("Scenario: Cada escenario deja la cuenta en su estado")
    void scenarioDeterminesTheAccountStatus(KycScenario scenario, KycStatus expected) {
        assertThat(scenario.resultingStatus()).isEqualTo(expected);
    }

    @Test
    @DisplayName("Scenario: UNAVAILABLE no crea cuenta")
    void unavailableScenarioHasNoAccountStatus() {
        assertThatThrownBy(KycScenario.UNAVAILABLE::resultingStatus).isInstanceOf(KycUnavailableException.class);
    }

    @Test
    @DisplayName("Scenario: El escenario predeterminado es APPROVED")
    void missingScenarioDefaultsToApproved() {
        assertThat(KycRequest.of("TEST", "TEST-001", null).scenario()).isEqualTo(KycScenario.APPROVED);
    }

    @ParameterizedTest
    @ValueSource(strings = {"DNI", "test", ""})
    @NullSource
    @DisplayName("Scenario: Solo se acepta documentType TEST")
    void onlyTestDocumentTypeIsAccepted(String documentType) {
        assertThatThrownBy(() -> KycRequest.of(documentType, "TEST-001", null))
                .isInstanceOf(InvalidKycRequestException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"12345678", "test-001", "TEST", ""})
    @NullSource
    @DisplayName("Scenario: Solo se acepta un documento con prefijo TEST-")
    void onlyTestPrefixedDocumentsAreAccepted(String document) {
        assertThatThrownBy(() -> KycRequest.of("TEST", document, null))
                .isInstanceOf(InvalidKycRequestException.class);
    }

    @Test
    @DisplayName("Scenario: Documento de más de 200 caracteres")
    void documentLongerThanTheLimitIsRejected() {
        assertThatThrownBy(() -> KycRequest.of("TEST", "TEST-" + "9".repeat(196), null))
                .isInstanceOf(InvalidKycRequestException.class);
        assertThat(KycRequest.of("TEST", "TEST-" + "9".repeat(195), null).document()).hasSize(200);
    }

    @Test
    @DisplayName("Scenario: Escenario desconocido")
    void unknownScenarioIsRejected() {
        assertThatThrownBy(() -> KycRequest.of("TEST", "TEST-001", "SOMETHING"))
                .isInstanceOf(InvalidKycRequestException.class);
    }

    @Test
    @DisplayName("Scenario: Decisión sobre una verificación PENDING")
    void pendingVerificationTakesTheFinalDecision() {
        KycVerification pending = KycVerification.register(KycScenario.MANUAL_REVIEW, walletId, KycStatus.PENDING);

        assertThat(pending.decide(KycDecision.ACTIVE).status()).isEqualTo(KycStatus.ACTIVE);
        assertThat(pending.decide(KycDecision.REJECTED).status()).isEqualTo(KycStatus.REJECTED);
    }

    @Test
    @DisplayName("Scenario: Repetir la misma decisión conserva el resultado")
    void repeatingTheSameDecisionKeepsTheResult() {
        KycVerification active = KycVerification.register(KycScenario.MANUAL_REVIEW, walletId, KycStatus.PENDING)
                .decide(KycDecision.ACTIVE);

        assertThat(active.decide(KycDecision.ACTIVE)).isSameAs(active);
    }

    @Test
    @DisplayName("Scenario: Cambiar una decisión final es un conflicto")
    void changingAFinalDecisionIsAConflict() {
        KycVerification rejected = KycVerification.register(KycScenario.REJECTED, walletId, KycStatus.REJECTED);

        assertThatThrownBy(() -> rejected.decide(KycDecision.ACTIVE)).isInstanceOf(DecisionConflictException.class);
    }

    @Test
    @DisplayName("Scenario: Decisión inválida")
    void decisionMustBeActiveOrRejected() {
        assertThat(KycDecision.parse("ACTIVE")).isEqualTo(KycDecision.ACTIVE);
        assertThatThrownBy(() -> KycDecision.parse("PENDING")).isInstanceOf(InvalidDecisionException.class);
        assertThatThrownBy(() -> KycDecision.parse(null)).isInstanceOf(InvalidDecisionException.class);
    }
}

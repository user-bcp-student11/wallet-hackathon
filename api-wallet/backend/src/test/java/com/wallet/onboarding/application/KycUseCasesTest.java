package com.wallet.onboarding.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wallet.onboarding.application.CreateKycVerificationUseCase.CreateKycCommand;
import com.wallet.onboarding.domain.DecisionConflictException;
import com.wallet.onboarding.domain.InvalidDecisionException;
import com.wallet.onboarding.domain.InvalidKycRequestException;
import com.wallet.onboarding.domain.KycId;
import com.wallet.onboarding.domain.KycNotFoundException;
import com.wallet.onboarding.domain.KycScenario;
import com.wallet.onboarding.domain.KycStatus;
import com.wallet.onboarding.domain.KycUnavailableException;
import com.wallet.onboarding.domain.KycVerification;
import com.wallet.support.FakeSupportCases;
import com.wallet.support.FakeWalletProvisioning;
import com.wallet.support.InMemoryKycVerificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class KycUseCasesTest {

    private InMemoryKycVerificationRepository verifications;
    private FakeWalletProvisioning wallets;
    private FakeSupportCases supportCases;
    private CreateKycVerificationUseCase create;
    private DecideKycVerificationUseCase decide;
    private GetKycVerificationUseCase get;

    @BeforeEach
    void setUp() {
        verifications = new InMemoryKycVerificationRepository();
        wallets = new FakeWalletProvisioning();
        supportCases = new FakeSupportCases();
        create = new CreateKycVerificationUseCase(verifications, wallets, supportCases);
        decide = new DecideKycVerificationUseCase(verifications, wallets, supportCases);
        get = new GetKycVerificationUseCase(verifications);
    }

    private KycVerification createWith(String scenario) {
        return create.execute(new CreateKycCommand("TEST", "TEST-001", scenario));
    }

    @Test
    @DisplayName("Scenario: APPROVED crea una wallet ACTIVE")
    void approvedCreatesAnActiveWallet() {
        KycVerification verification = createWith("APPROVED");

        assertThat(verification.status()).isEqualTo(KycStatus.ACTIVE);
        assertThat(wallets.statusOf(verification.walletId())).isEqualTo(KycStatus.ACTIVE);
        assertThat(supportCases.size()).isZero();
    }

    @Test
    @DisplayName("Scenario: Sin escenario se aplica APPROVED")
    void defaultScenarioIsApproved() {
        KycVerification verification = createWith(null);

        assertThat(verification.scenario()).isEqualTo(KycScenario.APPROVED);
        assertThat(verification.status()).isEqualTo(KycStatus.ACTIVE);
    }

    @Test
    @DisplayName("Scenario: REJECTED crea una cuenta rechazada")
    void rejectedCreatesARejectedWallet() {
        KycVerification verification = createWith("REJECTED");

        assertThat(verification.status()).isEqualTo(KycStatus.REJECTED);
        assertThat(wallets.statusOf(verification.walletId())).isEqualTo(KycStatus.REJECTED);
    }

    @Test
    @DisplayName("Scenario: MANUAL_REVIEW deja PENDING y abre un caso de soporte")
    void manualReviewLeavesTheAccountPendingAndOpensASupportCase() {
        KycVerification verification = createWith("MANUAL_REVIEW");

        assertThat(verification.status()).isEqualTo(KycStatus.PENDING);
        assertThat(wallets.statusOf(verification.walletId())).isEqualTo(KycStatus.PENDING);
        assertThat(supportCases.statusOf(verification.id())).isEqualTo("OPEN");
    }

    @Test
    @DisplayName("Scenario: UNAVAILABLE no crea cuenta")
    void unavailableCreatesNothing() {
        assertThatThrownBy(() -> createWith("UNAVAILABLE")).isInstanceOf(KycUnavailableException.class);

        assertThat(wallets.size()).isZero();
        assertThat(verifications.size()).isZero();
        assertThat(supportCases.size()).isZero();
    }

    @Test
    @DisplayName("Scenario: Entrada inválida no crea cuenta")
    void invalidRequestCreatesNothing() {
        assertThatThrownBy(() -> create.execute(new CreateKycCommand("DNI", "12345678", null)))
                .isInstanceOf(InvalidKycRequestException.class);

        assertThat(wallets.size()).isZero();
    }

    @Test
    @DisplayName("Scenario: Altas repetidas no se evitan")
    void repeatedRegistrationsCreateIndependentAccounts() {
        KycVerification first = createWith("APPROVED");
        KycVerification second = createWith("APPROVED");

        assertThat(second.id()).isNotEqualTo(first.id());
        assertThat(second.walletId()).isNotEqualTo(first.walletId());
    }

    @Test
    @DisplayName("Scenario: Consultar una verificación")
    void existingVerificationIsReturned() {
        KycVerification created = createWith("APPROVED");

        assertThat(get.execute(created.id())).isEqualTo(created);
        assertThatThrownBy(() -> get.execute(KycId.of("kyc-inexistente"))).isInstanceOf(KycNotFoundException.class);
    }

    @Test
    @DisplayName("Scenario: Decisión ACTIVE activa la wallet y resuelve el caso")
    void activeDecisionActivatesTheWalletAndResolvesTheCase() {
        KycVerification pending = createWith("MANUAL_REVIEW");

        KycVerification decided = decide.execute(pending.id(), "ACTIVE");

        assertThat(decided.status()).isEqualTo(KycStatus.ACTIVE);
        assertThat(wallets.statusOf(pending.walletId())).isEqualTo(KycStatus.ACTIVE);
        assertThat(supportCases.statusOf(pending.id())).isEqualTo("RESOLVED");
        assertThat(get.execute(pending.id()).status()).isEqualTo(KycStatus.ACTIVE);
    }

    @Test
    @DisplayName("Scenario: Decisión REJECTED rechaza la wallet y resuelve el caso")
    void rejectedDecisionRejectsTheWalletAndResolvesTheCase() {
        KycVerification pending = createWith("MANUAL_REVIEW");

        decide.execute(pending.id(), "REJECTED");

        assertThat(wallets.statusOf(pending.walletId())).isEqualTo(KycStatus.REJECTED);
        assertThat(supportCases.statusOf(pending.id())).isEqualTo("RESOLVED");
    }

    @Test
    @DisplayName("Scenario: Repetir la misma decisión devuelve el mismo resultado")
    void repeatedDecisionKeepsTheResult() {
        KycVerification pending = createWith("MANUAL_REVIEW");
        KycVerification first = decide.execute(pending.id(), "ACTIVE");

        assertThat(decide.execute(pending.id(), "ACTIVE")).isEqualTo(first);
    }

    @Test
    @DisplayName("Scenario: Cambiar una decisión final devuelve conflicto")
    void changingAFinalDecisionIsRejectedAndKeepsTheState() {
        KycVerification pending = createWith("MANUAL_REVIEW");
        decide.execute(pending.id(), "ACTIVE");

        assertThatThrownBy(() -> decide.execute(pending.id(), "REJECTED")).isInstanceOf(DecisionConflictException.class);
        assertThat(wallets.statusOf(pending.walletId())).isEqualTo(KycStatus.ACTIVE);
    }

    @Test
    @DisplayName("Scenario: Decidir sobre una cuenta ya aprobada contradiciéndola es conflicto")
    void contradictingAnApprovedAccountIsAConflict() {
        KycVerification approved = createWith("APPROVED");

        assertThat(decide.execute(approved.id(), "ACTIVE").status()).isEqualTo(KycStatus.ACTIVE);
        assertThatThrownBy(() -> decide.execute(approved.id(), "REJECTED")).isInstanceOf(DecisionConflictException.class);
    }

    @Test
    @DisplayName("Scenario: Decisión inválida")
    void invalidDecisionIsRejectedBeforeLookingUpTheVerification() {
        assertThatThrownBy(() -> decide.execute(KycId.of("kyc-inexistente"), "MAYBE"))
                .isInstanceOf(InvalidDecisionException.class);
    }

    @Test
    @DisplayName("Scenario: Decisión sobre una verificación inexistente")
    void decisionOnAnUnknownVerificationIsNotFound() {
        assertThatThrownBy(() -> decide.execute(KycId.of("kyc-inexistente"), "ACTIVE"))
                .isInstanceOf(KycNotFoundException.class);
    }
}

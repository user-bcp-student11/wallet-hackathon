package com.wallet.wallet.adapters;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.wallet.support.ApiTest;
import com.wallet.support.Fixtures;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class WalletApiIT extends ApiTest {

    @Test
    @DisplayName("Scenario: Onboarding completado")
    void completingTheLastStepActivatesTheWalletAndCompletesTheOnboarding() throws Exception {
        UUID id = onboardingReadyToConfirm();

        submitStep(id, "confirmation", Fixtures.validConfirmationStep())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.walletActive").value(true));
        getWallet("").andExpect(jsonPath("$.state").value("ACTIVE"));
        assertThat(jdbc.sql("SELECT status FROM onboardings").query(String.class).single()).isEqualTo("COMPLETED");
    }

    @Test
    @DisplayName("Scenario: Onboarding incompleto")
    void incompleteOnboardingDoesNotActivateTheWallet() throws Exception {
        UUID id = startedOnboardingId();
        submitStep(id, "phone", Fixtures.validPhoneStep());

        assertThat(jdbc.sql("SELECT count(*) FROM wallets").query(Long.class).single()).isZero();
    }

    @Test
    @DisplayName("Scenario: Confirmación tras completar")
    void confirmingACompletedOnboardingReturnsTheActiveWallet() throws Exception {
        UUID id = onboardingReadyToConfirm();
        submitStep(id, "confirmation", Fixtures.validConfirmationStep());

        submitStep(id, "confirmation", Fixtures.validConfirmationStep())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.walletActive").value(true));
        assertThat(jdbc.sql("SELECT count(*) FROM wallets").query(Long.class).single()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Scenario: Wallet activa")
    void activeWalletEnablesThePaymentsEntryPoint() throws Exception {
        UUID id = onboardingReadyToConfirm();
        submitStep(id, "confirmation", Fixtures.validConfirmationStep());

        getWallet("/payments-access")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true));
    }

    @Test
    @DisplayName("Scenario: Wallet no activa")
    void userWithoutActiveWalletIsDeniedWithAnActionableMessage() throws Exception {
        getWallet("/payments-access")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("Completa tu registro para activar tu wallet y poder pagar."))
                .andExpect(jsonPath("$.walletState").value("NO_WALLET"));
    }

    @Test
    @DisplayName("Scenario: Usuario con onboarding en curso")
    void walletStatusReportsTheOnboardingInProgressAndItsCurrentStep() throws Exception {
        UUID id = startedOnboardingId();
        submitStep(id, "phone", Fixtures.validPhoneStep());

        getWallet("")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("ONBOARDING_IN_PROGRESS"))
                .andExpect(jsonPath("$.onboardingId").value(id.toString()))
                .andExpect(jsonPath("$.currentStep").value("identity"));
        getWallet("/payments-access")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.currentStep").value("identity"));
    }

    @Test
    @DisplayName("Scenario: Usuario sin wallet")
    void userWithoutWalletNorOnboardingHasNoWallet() throws Exception {
        getWallet("").andExpect(jsonPath("$.state").value("NO_WALLET"));
    }
}

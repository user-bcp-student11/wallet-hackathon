package com.wallet.onboarding.adapters;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.wallet.support.ApiTest;
import com.wallet.support.Fixtures;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

class IdempotencyIT extends ApiTest {

    @Test
    @DisplayName("Scenario: Inicio repetido con la misma clave")
    void sameKeyOnStartReturnsTheSameResponse() throws Exception {
        MockHttpServletResponse first = startOnboarding("key-start-1").andReturn().getResponse();
        MockHttpServletResponse second = startOnboarding("key-start-1").andReturn().getResponse();

        assertThat(second.getStatus()).isEqualTo(first.getStatus()).isEqualTo(201);
        assertThat(second.getContentAsString()).isEqualTo(first.getContentAsString());
        assertThat(second.getHeader("Idempotent-Replayed")).isEqualTo("true");
        assertThat(jdbc.sql("SELECT count(*) FROM onboardings").query(Long.class).single()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Scenario: Confirmación repetida")
    void sameKeyOnConfirmationReturnsTheSameResponseAndActivatesOnce() throws Exception {
        UUID id = onboardingReadyToConfirm();

        MockHttpServletResponse first = submitStep(id, "confirmation", Fixtures.validConfirmationStep(), "key-confirm-1")
                .andExpect(status().isOk()).andReturn().getResponse();
        MockHttpServletResponse second = submitStep(id, "confirmation", Fixtures.validConfirmationStep(), "key-confirm-1")
                .andExpect(status().isOk()).andReturn().getResponse();

        assertThat(second.getContentAsString()).isEqualTo(first.getContentAsString());
        assertThat(second.getHeader("Idempotent-Replayed")).isEqualTo("true");
        assertThat(jdbc.sql("SELECT count(*) FROM wallets").query(Long.class).single()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Scenario: Misma clave en otro onboarding")
    void sameKeyOnAnotherResourceIsNotReplayed() throws Exception {
        UUID first = onboardingReadyToConfirm();
        submitStep(first, "confirmation", Fixtures.validConfirmationStep(), "shared-key").andExpect(status().isOk());
        UUID second = startedOnboardingId();

        String body = submitStep(second, "phone", Fixtures.validPhoneStep(), "shared-key")
                .andReturn().getResponse().getContentAsString();

        assertThat(body).contains(second.toString()).doesNotContain(first.toString());
    }
}

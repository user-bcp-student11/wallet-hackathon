package com.wallet.shared.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.wallet.support.ApiTest;
import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class MockLatencyIT extends ApiTest {

    private static final String WALLET = "/wallets/wallet-demo";

    private Duration timed(MockHttpServletRequestBuilder request, int expectedStatus, String expectedHeader)
            throws Exception {
        long start = System.nanoTime();
        mockMvc.perform(request).andExpect(status().is(expectedStatus))
                .andExpect(header().string("X-Mock-Latency-Ms", expectedHeader));
        return Duration.ofNanos(System.nanoTime() - start);
    }

    @Test
    @DisplayName("Scenario: Sin latencia el header informa 0")
    void defaultLatencyIsZero() throws Exception {
        mockMvc.perform(get(WALLET)).andExpect(status().isOk()).andExpect(header().string("X-Mock-Latency-Ms", "0"));
    }

    @Test
    @DisplayName("Scenario: El header X-Mock-Latency-Ms retrasa la respuesta")
    void headerDelaysTheResponse() throws Exception {
        Duration elapsed = timed(get(WALLET).header("X-Mock-Latency-Ms", "300"), 200, "300");

        assertThat(elapsed).isGreaterThanOrEqualTo(Duration.ofMillis(300));
    }

    @Test
    @DisplayName("Scenario: El query param latency retrasa la respuesta")
    void queryParamDelaysTheResponse() throws Exception {
        Duration elapsed = timed(get(WALLET).param("latency", "250"), 200, "250");

        assertThat(elapsed).isGreaterThanOrEqualTo(Duration.ofMillis(250));
    }

    @Test
    @DisplayName("Scenario: El header tiene prioridad sobre el query param")
    void headerTakesPriorityOverQuery() throws Exception {
        Duration elapsed = timed(get(WALLET).header("X-Mock-Latency-Ms", "0").param("latency", "4000"), 200, "0");

        assertThat(elapsed).isLessThan(Duration.ofSeconds(3));
    }

    @Test
    @DisplayName("Scenario: Se aplica también en errores")
    void delayAlsoAppliesToErrors() throws Exception {
        Duration elapsed = timed(get("/wallets/inexistente").header("X-Mock-Latency-Ms", "200"), 404, "200");

        assertThat(elapsed).isGreaterThanOrEqualTo(Duration.ofMillis(200));
    }

    @Test
    @DisplayName("Scenario: Se aplica a las operaciones de escritura")
    void delayAppliesToPostOperations() throws Exception {
        long start = System.nanoTime();
        mockMvc.perform(post("/kyc/verifications").param("latency", "200").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"documentType\":\"TEST\",\"document\":\"TEST-001\"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("X-Mock-Latency-Ms", "200"));

        assertThat(Duration.ofNanos(System.nanoTime() - start)).isGreaterThanOrEqualTo(Duration.ofMillis(200));
    }

    @Test
    @DisplayName("Scenario: Valor inválido devuelve 400 INVALID_MOCK_LATENCY sin ejecutar la operación")
    void invalidLatencyIsRejectedBeforeTheOperation() throws Exception {
        mockMvc.perform(get(WALLET).header("X-Mock-Latency-Ms", "5001"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_MOCK_LATENCY"));
        mockMvc.perform(get(WALLET).param("latency", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_MOCK_LATENCY"));
        mockMvc.perform(get(WALLET).header("X-Mock-Latency-Ms", "100").param("latency", "-5"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_MOCK_LATENCY"));
        mockMvc.perform(post("/kyc/verifications").header("X-Mock-Latency-Ms", "-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"documentType\":\"TEST\",\"document\":\"TEST-001\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_MOCK_LATENCY"));

        assertThat(jdbc.sql("SELECT count(*) FROM kyc_verifications").query(Long.class).single()).isZero();
    }
}

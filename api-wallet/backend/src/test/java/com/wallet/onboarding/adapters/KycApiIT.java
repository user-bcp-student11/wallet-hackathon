package com.wallet.onboarding.adapters;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.wallet.support.ApiTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class KycApiIT extends ApiTest {

    private long userWallets() {
        return jdbc.sql("SELECT count(*) FROM wallets WHERE id <> 'wallet-demo'").query(Long.class).single();
    }

    private String supportCaseStatus(String kycId) {
        return jdbc.sql("SELECT status FROM support_cases WHERE resource = :id AND reason = 'KYC_REVIEW'")
                .param("id", kycId).query(String.class).single();
    }

    private void expectError(ResultActions result, int status, String code) throws Exception {
        result.andExpect(status().is(status))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value(code));
    }

    @Test
    @DisplayName("Scenario: APPROVED crea una wallet ACTIVE con saldo cero")
    void approvedCreatesAnActiveWalletWithZeroBalance() throws Exception {
        JsonNode kyc = body(createKyc("APPROVED").andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.wallet_id").isNotEmpty())
                .andExpect(jsonPath("$.scenario").value("APPROVED"))
                .andExpect(jsonPath("$.status").value("ACTIVE")));

        getWallet(kyc.get("wallet_id").asText())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(kyc.get("wallet_id").asText()))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.balance").value(0))
                .andExpect(jsonPath("$.reserved").value(0))
                .andExpect(jsonPath("$.available").value(0))
                .andExpect(jsonPath("$.currency").value("PEN"));
    }

    @Test
    @DisplayName("Scenario: Sin escenario se aplica APPROVED")
    void defaultScenarioIsApproved() throws Exception {
        createKyc(null).andExpect(status().isCreated())
                .andExpect(jsonPath("$.scenario").value("APPROVED"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("Scenario: REJECTED crea una cuenta rechazada")
    void rejectedCreatesARejectedAccount() throws Exception {
        JsonNode kyc = body(createKyc("REJECTED").andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REJECTED")));

        getWallet(kyc.get("wallet_id").asText()).andExpect(jsonPath("$.status").value("REJECTED"));
    }

    @Test
    @DisplayName("Scenario: MANUAL_REVIEW deja PENDING y abre un caso de soporte")
    void manualReviewLeavesTheAccountPendingAndOpensASupportCase() throws Exception {
        JsonNode kyc = body(createKyc("MANUAL_REVIEW").andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING")));

        getWallet(kyc.get("wallet_id").asText()).andExpect(jsonPath("$.status").value("PENDING"));
        assertThat(supportCaseStatus(kyc.get("id").asText())).isEqualTo("OPEN");
    }

    @Test
    @DisplayName("Scenario: UNAVAILABLE devuelve 503 y no crea cuenta")
    void unavailableReturns503AndCreatesNothing() throws Exception {
        expectError(createKyc("UNAVAILABLE"), 503, "KYC_UNAVAILABLE");

        assertThat(userWallets()).isZero();
        assertThat(jdbc.sql("SELECT count(*) FROM kyc_verifications").query(Long.class).single()).isZero();
        assertThat(jdbc.sql("SELECT count(*) FROM support_cases").query(Long.class).single()).isZero();
    }

    @Test
    @DisplayName("Scenario: No se evitan las altas repetidas")
    void repeatedRegistrationsAreNotPrevented() throws Exception {
        JsonNode first = createdKyc("APPROVED");
        JsonNode second = createdKyc("APPROVED");

        assertThat(second.get("id")).isNotEqualTo(first.get("id"));
        assertThat(userWallets()).isEqualTo(2);
    }

    @Test
    @DisplayName("Scenario: Entrada inválida devuelve 400 sin crear cuenta")
    void invalidInputReturns400AndCreatesNothing() throws Exception {
        expectError(postKyc("{\"documentType\":\"DNI\",\"document\":\"TEST-001\"}"), 400, "INVALID_REQUEST");
        expectError(postKyc("{\"documentType\":\"TEST\",\"document\":\"12345678\"}"), 400, "INVALID_REQUEST");
        expectError(postKyc("{\"documentType\":\"TEST\"}"), 400, "INVALID_REQUEST");
        expectError(postKyc("{\"document\":\"TEST-001\"}"), 400, "INVALID_REQUEST");
        expectError(createKyc("OTHER"), 400, "INVALID_REQUEST");
        expectError(postKyc("{ no es json"), 400, "INVALID_REQUEST");

        assertThat(userWallets()).isZero();
    }

    @Test
    @DisplayName("Scenario: Cuerpo mayor a 65536 bytes devuelve 413")
    void oversizedBodyReturns413() throws Exception {
        String document = "TEST-" + "9".repeat(66000);

        expectError(postKyc("{\"documentType\":\"TEST\",\"document\":\"" + document + "\"}"), 413, "PAYLOAD_TOO_LARGE");

        assertThat(userWallets()).isZero();
    }

    @Test
    @DisplayName("Scenario: Consultar una verificación por su ID kyc")
    void verificationIsFoundByItsKycId() throws Exception {
        JsonNode kyc = createdKyc("MANUAL_REVIEW");

        getKyc(kyc.get("id").asText())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(kyc.get("id").asText()))
                .andExpect(jsonPath("$.wallet_id").value(kyc.get("wallet_id").asText()))
                .andExpect(jsonPath("$.scenario").value("MANUAL_REVIEW"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @DisplayName("Scenario: El wallet_id no sirve como ID kyc")
    void walletIdIsNotAKycId() throws Exception {
        JsonNode kyc = createdKyc("APPROVED");

        expectError(getKyc(kyc.get("wallet_id").asText()), 404, "NOT_FOUND");
        expectError(getKyc("kyc-inexistente"), 404, "NOT_FOUND");
    }

    @Test
    @DisplayName("Scenario: Decisión ACTIVE activa la wallet y resuelve el caso")
    void activeDecisionActivatesTheWalletAndResolvesTheSupportCase() throws Exception {
        JsonNode kyc = createdKyc("MANUAL_REVIEW");
        String id = kyc.get("id").asText();

        decide(id, "ACTIVE", true)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.wallet_id").value(kyc.get("wallet_id").asText()))
                .andExpect(jsonPath("$.scenario").value("MANUAL_REVIEW"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        getKyc(id).andExpect(jsonPath("$.status").value("ACTIVE"));
        getWallet(kyc.get("wallet_id").asText()).andExpect(jsonPath("$.status").value("ACTIVE"));
        assertThat(supportCaseStatus(id)).isEqualTo("RESOLVED");
    }

    @Test
    @DisplayName("Scenario: Decisión REJECTED rechaza la wallet y resuelve el caso")
    void rejectedDecisionRejectsTheWalletAndResolvesTheSupportCase() throws Exception {
        JsonNode kyc = createdKyc("MANUAL_REVIEW");
        String id = kyc.get("id").asText();

        decide(id, "REJECTED", true).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REJECTED"));

        getWallet(kyc.get("wallet_id").asText()).andExpect(jsonPath("$.status").value("REJECTED"));
        assertThat(supportCaseStatus(id)).isEqualTo("RESOLVED");
    }

    @Test
    @DisplayName("Scenario: Repetir la misma decisión devuelve 200")
    void repeatingTheSameDecisionReturns200() throws Exception {
        String id = createdKyc("MANUAL_REVIEW").get("id").asText();
        decide(id, "ACTIVE", true).andExpect(status().isOk());

        decide(id, "ACTIVE", true).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("Scenario: Cambiar una decisión final devuelve 409 DECISION_CONFLICT")
    void changingAFinalDecisionReturns409() throws Exception {
        JsonNode kyc = createdKyc("MANUAL_REVIEW");
        String id = kyc.get("id").asText();
        decide(id, "ACTIVE", true).andExpect(status().isOk());

        expectError(decide(id, "REJECTED", true), 409, "DECISION_CONFLICT");

        getWallet(kyc.get("wallet_id").asText()).andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("Scenario: Contradecir una cuenta ya resuelta por el proveedor devuelve 409")
    void contradictingAnAutomaticallyResolvedAccountReturns409() throws Exception {
        String id = createdKyc("REJECTED").get("id").asText();

        expectError(decide(id, "ACTIVE", true), 409, "DECISION_CONFLICT");
        decide(id, "REJECTED", true).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Scenario: Decisión inválida devuelve 400 INVALID_DECISION")
    void invalidDecisionReturns400() throws Exception {
        String id = createdKyc("MANUAL_REVIEW").get("id").asText();

        expectError(decide(id, "PENDING", true), 400, "INVALID_DECISION");
        expectError(decide(id, "{}"), 400, "INVALID_DECISION");
        expectError(decide(id, "null", false), 400, "INVALID_DECISION");
        getKyc(id).andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @DisplayName("Scenario: Decisión sobre una verificación inexistente devuelve 404")
    void decisionOnAnUnknownVerificationReturns404() throws Exception {
        expectError(decide("kyc-inexistente", "ACTIVE", true), 404, "NOT_FOUND");
    }
}

package com.wallet.onboarding.adapters;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.wallet.support.ApiTest;
import com.wallet.support.Fixtures;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class OnboardingApiIT extends ApiTest {

    @Test
    @DisplayName("Scenario: Secuencia por defecto")
    void newOnboardingExposesTheConfiguredSteps() throws Exception {
        startOnboarding()
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.stepNumber").value(1))
                .andExpect(jsonPath("$.totalSteps").value(3))
                .andExpect(jsonPath("$.steps[0].code").value("phone"))
                .andExpect(jsonPath("$.steps[0].status").value("CURRENT"))
                .andExpect(jsonPath("$.steps[1].status").value("PENDING"))
                .andExpect(jsonPath("$.nextStepLabel").value("Tus datos personales"));
    }

    @Test
    @DisplayName("Scenario: Recarga durante el onboarding")
    void startingAgainReturnsTheSameOnboarding() throws Exception {
        UUID id = startedOnboardingId();

        startOnboarding()
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()));
        getOnboarding(id).andExpect(status().isOk()).andExpect(jsonPath("$.currentStep").value("phone"));
        org.assertj.core.api.Assertions.assertThat(
                jdbc.sql("SELECT count(*) FROM onboardings").query(Long.class).single()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Scenario: Campo obligatorio vacío")
    void missingRequiredFieldIsListedWithAnActionableMessage() throws Exception {
        UUID id = startedOnboardingId();

        submitStep(id, "phone", Map.of("phoneNumber", "912345678"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors.length()").value(1))
                .andExpect(jsonPath("$.errors[0].field").value("otpCode"))
                .andExpect(jsonPath("$.errors[0].message").value("Ingresa el código que enviamos a tu celular."));
        getOnboarding(id).andExpect(jsonPath("$.currentStep").value("phone"));
    }

    @Test
    @DisplayName("Scenario: Varios campos inválidos")
    void everyInvalidFieldIsReported() throws Exception {
        UUID id = startedOnboardingId();
        submitStep(id, "phone", Fixtures.validPhoneStep());
        Map<String, String> values = new HashMap<>(Fixtures.validIdentityStep());
        values.put("documentNumber", "1234567");
        values.put("birthDate", "2015-01-01");

        submitStep(id, "identity", values)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors.length()").value(2))
                .andExpect(jsonPath("$.errors[0].field").value("documentNumber"))
                .andExpect(jsonPath("$.errors[0].message").value("El DNI debe tener 8 dígitos."))
                .andExpect(jsonPath("$.errors[1].field").value("birthDate"))
                .andExpect(jsonPath("$.errors[1].message").value("Debes ser mayor de 18 años para registrarte."));
    }

    @Test
    @DisplayName("Scenario: Validación local insuficiente")
    void serverRejectsDataTheClientShouldHaveBlocked() throws Exception {
        UUID id = startedOnboardingId();

        submitStep(id, "phone", Map.of("phoneNumber", "812345678", "otpCode", Fixtures.OTP_CODE))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors[0].message").value("El celular debe empezar con 9."));
    }

    @Test
    @DisplayName("Scenario: Documento CE válido")
    void ceDocumentIsAccepted() throws Exception {
        UUID id = startedOnboardingId();
        submitStep(id, "phone", Fixtures.validPhoneStep());
        Map<String, String> values = new HashMap<>(Fixtures.validIdentityStep());
        values.put("documentType", "CE");
        values.put("documentNumber", "123456789");

        submitStep(id, "identity", values)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentStep").value("confirmation"));
    }

    @Test
    @DisplayName("Scenario: Salto de paso")
    void skippingAStepIsRejectedAndTheCurrentStepIsReported() throws Exception {
        UUID id = startedOnboardingId();

        submitStep(id, "identity", Fixtures.validIdentityStep())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.currentStep").value("phone"));
    }

    @Test
    @DisplayName("Scenario: Paso intermedio")
    void progressAfterTheFirstStepShowsItAsCompleted() throws Exception {
        UUID id = startedOnboardingId();

        submitStep(id, "phone", Fixtures.validPhoneStep())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stepNumber").value(2))
                .andExpect(jsonPath("$.steps[0].status").value("COMPLETED"))
                .andExpect(jsonPath("$.steps[1].status").value("CURRENT"))
                .andExpect(jsonPath("$.steps[2].status").value("PENDING"));
    }

    @Test
    @DisplayName("Scenario: Código incorrecto")
    void wrongOtpIsRejectedWithARetryMessage() throws Exception {
        UUID id = startedOnboardingId();

        submitStep(id, "phone", Map.of("phoneNumber", "912345678", "otpCode", "000000"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors[0].field").value("otpCode"))
                .andExpect(jsonPath("$.errors[0].message")
                        .value("El código es incorrecto. Revísalo e inténtalo de nuevo."));
    }

    @Test
    @DisplayName("Scenario: Código correcto")
    void configuredFakeOtpCodeIsAccepted() throws Exception {
        UUID id = startedOnboardingId();

        mockMvc.perform(post("/api/v1/onboardings/" + id + "/otp")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phoneNumber\":\"912345678\"}"))
                .andExpect(status().isNoContent());
        submitStep(id, "phone", Fixtures.validPhoneStep())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentStep").value("identity"));
    }

    @Test
    @DisplayName("Scenario: Celular con formato inválido (envío de código)")
    void otpIsNotSentToAnInvalidPhone() throws Exception {
        UUID id = startedOnboardingId();

        mockMvc.perform(post("/api/v1/onboardings/" + id + "/otp")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phoneNumber\":\"812345678\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors[0].field").value("phoneNumber"));
    }

    @Test
    @DisplayName("Scenario: Onboarding de otro usuario")
    void anotherUsersOnboardingIsNotFound() throws Exception {
        UUID id = startedOnboardingId();

        mockMvc.perform(get("/api/v1/onboardings/" + id).header("X-User-Id", UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Scenario: Solicitud sin identificación de usuario")
    void missingUserHeaderIsABadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/onboardings"))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Content-Type", "application/problem+json"));
    }

    @Test
    @DisplayName("Scenario: Continuar un onboarding abandonado")
    void abandonedOnboardingCannotBeContinued() throws Exception {
        UUID id = startedOnboardingId();
        jdbc.sql("UPDATE onboardings SET status = 'ABANDONED'").update();

        submitStep(id, "phone", Fixtures.validPhoneStep())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Tu registro venció por inactividad. Inicia un registro nuevo."));
        startOnboarding().andExpect(status().isCreated());
    }
}

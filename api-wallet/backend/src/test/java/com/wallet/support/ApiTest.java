package com.wallet.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

public abstract class ApiTest extends IntegrationTest {

    protected static final String USER_HEADER = "X-User-Id";
    protected static final String IDEMPOTENCY_HEADER = "Idempotency-Key";

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    protected final UUID userId = UUID.randomUUID();

    protected ResultActions startOnboarding() throws Exception {
        return mockMvc.perform(post("/api/v1/onboardings").header(USER_HEADER, userId));
    }

    protected ResultActions startOnboarding(String idempotencyKey) throws Exception {
        return mockMvc.perform(post("/api/v1/onboardings")
                .header(USER_HEADER, userId).header(IDEMPOTENCY_HEADER, idempotencyKey));
    }

    protected UUID startedOnboardingId() throws Exception {
        return UUID.fromString(body(startOnboarding()).get("id").asText());
    }

    protected ResultActions submitStep(UUID onboardingId, String step, Map<String, String> values) throws Exception {
        return mockMvc.perform(stepRequest(onboardingId, step, values));
    }

    protected ResultActions submitStep(UUID onboardingId, String step, Map<String, String> values, String key)
            throws Exception {
        return mockMvc.perform(stepRequest(onboardingId, step, values).header(IDEMPOTENCY_HEADER, key));
    }

    protected ResultActions getOnboarding(UUID onboardingId) throws Exception {
        return mockMvc.perform(get("/api/v1/onboardings/" + onboardingId).header(USER_HEADER, userId));
    }

    protected ResultActions getWallet(String path) throws Exception {
        return mockMvc.perform(get("/api/v1/wallet" + path).header(USER_HEADER, userId));
    }

    protected UUID onboardingReadyToConfirm() throws Exception {
        UUID id = startedOnboardingId();
        submitStep(id, "phone", Fixtures.validPhoneStep());
        submitStep(id, "identity", Fixtures.validIdentityStep());
        return id;
    }

    protected JsonNode body(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString());
    }

    private MockHttpServletRequestBuilder stepRequest(
            UUID onboardingId, String step, Map<String, String> values) throws Exception {
        return post("/api/v1/onboardings/" + onboardingId + "/steps/" + step)
                .header(USER_HEADER, userId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("values", values)));
    }
}

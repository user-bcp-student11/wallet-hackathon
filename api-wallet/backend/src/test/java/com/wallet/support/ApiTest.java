package com.wallet.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

public abstract class ApiTest extends IntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    protected ResultActions createKyc(String scenario) throws Exception {
        String scenarioField = scenario == null ? "" : ",\"scenario\":\"" + scenario + "\"";
        return postKyc("{\"documentType\":\"TEST\",\"document\":\"TEST-001\"" + scenarioField + "}");
    }

    protected ResultActions postKyc(String json) throws Exception {
        return mockMvc.perform(post("/kyc/verifications").contentType(MediaType.APPLICATION_JSON).content(json));
    }

    protected ResultActions getKyc(String id) throws Exception {
        return mockMvc.perform(get("/kyc/verifications/" + id));
    }

    protected ResultActions decide(String id, String json) throws Exception {
        return mockMvc.perform(post("/kyc/verifications/" + id + "/decision")
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    protected ResultActions decide(String id, String decision, boolean quoted) throws Exception {
        return decide(id, "{\"decision\":" + (quoted ? "\"" + decision + "\"" : decision) + "}");
    }

    protected ResultActions getWallet(String id) throws Exception {
        return mockMvc.perform(get("/wallets/" + id));
    }

    protected JsonNode body(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString());
    }

    protected JsonNode createdKyc(String scenario) throws Exception {
        return body(createKyc(scenario));
    }
}

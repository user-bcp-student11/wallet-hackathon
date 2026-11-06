package com.wallet.support;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(properties = "onboarding.abandon-check-interval=PT24H")
@AutoConfigureMockMvc
public abstract class IntegrationTest {

    @Autowired
    protected JdbcClient jdbc;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", TestDatabase::jdbcUrl);
        registry.add("spring.datasource.username", TestDatabase::user);
        registry.add("spring.datasource.password", TestDatabase::password);
        registry.add("onboarding.otp.fake-code", () -> Fixtures.OTP_CODE);
    }

    @BeforeEach
    void cleanDatabase() {
        jdbc.sql("TRUNCATE onboarding_steps, onboardings, idempotency_records, wallets CASCADE").update();
    }
}

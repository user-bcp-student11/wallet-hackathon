package com.wallet.onboarding.adapters;

import static org.assertj.core.api.Assertions.assertThat;

import com.wallet.support.IntegrationTest;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class FlywayMigrationsIT extends IntegrationTest {

    @Test
    @DisplayName("Scenario: Migraciones aplicadas limpias")
    void allMigrationsAreAppliedOnAnEmptyDatabase() {
        List<String> tables = jdbc.sql("""
                        SELECT table_name FROM information_schema.tables
                         WHERE table_schema = 'public' ORDER BY table_name
                        """)
                .query(String.class).list();
        List<Boolean> successes = jdbc.sql("SELECT success FROM flyway_schema_history")
                .query(Boolean.class).list();

        assertThat(tables).contains("onboardings", "onboarding_steps", "idempotency_records", "wallets");
        assertThat(successes).isNotEmpty().doesNotContain(false);
    }
}

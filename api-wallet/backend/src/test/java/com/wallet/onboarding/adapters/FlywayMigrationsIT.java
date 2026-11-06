package com.wallet.onboarding.adapters;

import static org.assertj.core.api.Assertions.assertThat;

import com.wallet.support.IntegrationTest;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class FlywayMigrationsIT extends IntegrationTest {

    @Test
    @DisplayName("Scenario: Las migraciones se aplican limpias sobre PostgreSQL")
    void allMigrationsAreAppliedOnAnEmptyDatabase() {
        List<String> tables = jdbc.sql("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
                .query(String.class).list();
        List<Boolean> successes = jdbc.sql("SELECT success FROM flyway_schema_history")
                .query(Boolean.class).list();

        assertThat(tables).contains("wallets", "kyc_verifications", "support_cases");
        assertThat(successes).isNotEmpty().doesNotContain(false);
    }

    @Test
    @DisplayName("Scenario: wallet-demo precargada ACTIVE con 100000")
    void walletDemoIsSeeded() {
        var wallet = jdbc.sql("SELECT status, balance, reserved FROM wallets WHERE id = 'wallet-demo'")
                .query((rs, rowNum) -> rs.getString("status") + "/" + rs.getLong("balance") + "/" + rs.getLong("reserved"))
                .single();

        assertThat(wallet).isEqualTo("ACTIVE/100000/0");
    }
}

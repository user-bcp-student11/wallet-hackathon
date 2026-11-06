package com.wallet.onboarding.adapters.out.persistence;

import com.wallet.onboarding.application.port.out.IdempotencyStorePort;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcIdempotencyStore implements IdempotencyStorePort {

    private final JdbcClient jdbc;
    private final Clock clock;

    public JdbcIdempotencyStore(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    @Override
    public Optional<StoredResponse> find(String scope, String key) {
        return jdbc.sql("SELECT status_code, response_body FROM idempotency_records "
                        + "WHERE scope = :scope AND idempotency_key = :key")
                .param("scope", scope)
                .param("key", key)
                .query((rs, rowNum) -> new StoredResponse(rs.getInt("status_code"), rs.getString("response_body")))
                .optional();
    }

    @Override
    public void save(String scope, String key, StoredResponse response) {
        jdbc.sql("""
                        INSERT INTO idempotency_records (scope, idempotency_key, status_code, response_body, created_at)
                        VALUES (:scope, :key, :status, :body, :at)
                        ON CONFLICT (scope, idempotency_key) DO NOTHING
                        """)
                .param("scope", scope)
                .param("key", key)
                .param("status", response.status())
                .param("body", response.body())
                .param("at", OffsetDateTime.ofInstant(clock.instant(), java.time.ZoneOffset.UTC))
                .update();
    }
}

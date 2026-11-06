package com.wallet.wallet.adapters.out.persistence;

import com.wallet.shared.domain.UserId;
import com.wallet.wallet.application.port.out.WalletRepositoryPort;
import com.wallet.wallet.domain.Wallet;
import com.wallet.wallet.domain.WalletStatus;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcWalletRepository implements WalletRepositoryPort {

    private final JdbcClient jdbc;

    public JdbcWalletRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<Wallet> findByUser(UserId userId) {
        return jdbc.sql("SELECT user_id, status, activated_at FROM wallets WHERE user_id = :userId")
                .param("userId", userId.value())
                .query((rs, rowNum) -> new Wallet(
                        UserId.of(rs.getObject("user_id", UUID.class)),
                        WalletStatus.valueOf(rs.getString("status")),
                        rs.getObject("activated_at", OffsetDateTime.class).toInstant()))
                .optional();
    }

    @Override
    public void insertIfAbsent(Wallet wallet) {
        jdbc.sql("""
                        INSERT INTO wallets (user_id, status, activated_at) VALUES (:userId, :status, :at)
                        ON CONFLICT (user_id) DO NOTHING
                        """)
                .param("userId", wallet.userId().value())
                .param("status", wallet.status().name())
                .param("at", OffsetDateTime.ofInstant(wallet.activatedAt(), ZoneOffset.UTC))
                .update();
    }
}

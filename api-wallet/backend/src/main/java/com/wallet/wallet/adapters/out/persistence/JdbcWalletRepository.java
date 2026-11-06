package com.wallet.wallet.adapters.out.persistence;

import com.wallet.shared.domain.WalletId;
import com.wallet.wallet.application.port.out.WalletRepositoryPort;
import com.wallet.wallet.domain.Wallet;
import com.wallet.wallet.domain.WalletStatus;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcWalletRepository implements WalletRepositoryPort {

    private final JdbcClient jdbc;

    public JdbcWalletRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void insert(Wallet wallet) {
        jdbc.sql("INSERT INTO wallets (id, status, balance, reserved) VALUES (:id, :status, :balance, :reserved)")
                .param("id", wallet.id().value())
                .param("status", wallet.status().name())
                .param("balance", wallet.balance())
                .param("reserved", wallet.reserved())
                .update();
    }

    @Override
    public Optional<Wallet> findById(WalletId id) {
        return jdbc.sql("SELECT id, status, balance, reserved FROM wallets WHERE id = :id")
                .param("id", id.value())
                .query((rs, rowNum) -> new Wallet(
                        WalletId.of(rs.getString("id")),
                        WalletStatus.valueOf(rs.getString("status")),
                        rs.getLong("balance"),
                        rs.getLong("reserved")))
                .optional();
    }

    @Override
    public void updateStatus(WalletId id, WalletStatus status) {
        jdbc.sql("UPDATE wallets SET status = :status WHERE id = :id")
                .param("status", status.name())
                .param("id", id.value())
                .update();
    }
}

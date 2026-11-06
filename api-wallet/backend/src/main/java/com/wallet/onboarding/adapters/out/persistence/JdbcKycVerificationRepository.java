package com.wallet.onboarding.adapters.out.persistence;

import com.wallet.onboarding.application.port.out.KycVerificationRepositoryPort;
import com.wallet.onboarding.domain.KycId;
import com.wallet.onboarding.domain.KycScenario;
import com.wallet.onboarding.domain.KycStatus;
import com.wallet.onboarding.domain.KycVerification;
import com.wallet.shared.domain.WalletId;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcKycVerificationRepository implements KycVerificationRepositoryPort {

    private static final String SELECT = "SELECT id, wallet_id, scenario, status FROM kyc_verifications WHERE id = :id";

    private final JdbcClient jdbc;

    public JdbcKycVerificationRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void insert(KycVerification verification) {
        jdbc.sql("INSERT INTO kyc_verifications (id, wallet_id, scenario, status) VALUES (:id, :walletId, :scenario, :status)")
                .param("id", verification.id().value())
                .param("walletId", verification.walletId().value())
                .param("scenario", verification.scenario().name())
                .param("status", verification.status().name())
                .update();
    }

    @Override
    public Optional<KycVerification> findById(KycId id) {
        return jdbc.sql(SELECT).param("id", id.value()).query(this::map).optional();
    }

    @Override
    public Optional<KycVerification> findForUpdate(KycId id) {
        return jdbc.sql(SELECT + " FOR UPDATE").param("id", id.value()).query(this::map).optional();
    }

    @Override
    public void updateStatus(KycId id, KycStatus status) {
        jdbc.sql("UPDATE kyc_verifications SET status = :status WHERE id = :id")
                .param("status", status.name())
                .param("id", id.value())
                .update();
    }

    private KycVerification map(ResultSet rs, int rowNum) throws SQLException {
        return new KycVerification(
                KycId.of(rs.getString("id")),
                WalletId.of(rs.getString("wallet_id")),
                KycScenario.valueOf(rs.getString("scenario")),
                KycStatus.valueOf(rs.getString("status")));
    }
}

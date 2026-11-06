package com.wallet.onboarding.adapters.out.persistence;

import com.wallet.onboarding.application.port.out.SupportCasePort;
import com.wallet.onboarding.domain.KycId;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcSupportCaseRepository implements SupportCasePort {

    private static final String KYC_REVIEW = "KYC_REVIEW";

    private final JdbcClient jdbc;

    public JdbcSupportCaseRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void openKycReview(KycId kycId) {
        jdbc.sql("INSERT INTO support_cases (id, resource, reason, status) VALUES (:id, :resource, :reason, 'OPEN')")
                .param("id", "case-" + UUID.randomUUID())
                .param("resource", kycId.value())
                .param("reason", KYC_REVIEW)
                .update();
    }

    @Override
    public void resolveKycReview(KycId kycId) {
        jdbc.sql("UPDATE support_cases SET status = 'RESOLVED' WHERE resource = :resource AND reason = :reason")
                .param("resource", kycId.value())
                .param("reason", KYC_REVIEW)
                .update();
    }
}

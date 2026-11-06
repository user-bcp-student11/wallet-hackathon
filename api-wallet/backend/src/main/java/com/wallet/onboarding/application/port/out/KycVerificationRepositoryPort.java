package com.wallet.onboarding.application.port.out;

import com.wallet.onboarding.domain.KycId;
import com.wallet.onboarding.domain.KycStatus;
import com.wallet.onboarding.domain.KycVerification;
import java.util.Optional;

public interface KycVerificationRepositoryPort {

    void insert(KycVerification verification);

    Optional<KycVerification> findById(KycId id);

    /** Bloquea la verificación hasta que termine la transacción, para serializar decisiones concurrentes. */
    Optional<KycVerification> findForUpdate(KycId id);

    void updateStatus(KycId id, KycStatus status);
}

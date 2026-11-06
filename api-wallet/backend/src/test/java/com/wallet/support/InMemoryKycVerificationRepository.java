package com.wallet.support;

import com.wallet.onboarding.application.port.out.KycVerificationRepositoryPort;
import com.wallet.onboarding.domain.KycId;
import com.wallet.onboarding.domain.KycStatus;
import com.wallet.onboarding.domain.KycVerification;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public class InMemoryKycVerificationRepository implements KycVerificationRepositoryPort {

    private final Map<KycId, KycVerification> store = new HashMap<>();

    @Override
    public void insert(KycVerification verification) {
        store.put(verification.id(), verification);
    }

    @Override
    public Optional<KycVerification> findById(KycId id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public Optional<KycVerification> findForUpdate(KycId id) {
        return findById(id);
    }

    @Override
    public void updateStatus(KycId id, KycStatus status) {
        KycVerification current = store.get(id);
        store.put(id, new KycVerification(id, current.walletId(), current.scenario(), status));
    }

    public int size() {
        return store.size();
    }
}

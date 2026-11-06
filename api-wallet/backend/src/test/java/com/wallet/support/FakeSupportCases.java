package com.wallet.support;

import com.wallet.onboarding.application.port.out.SupportCasePort;
import com.wallet.onboarding.domain.KycId;
import java.util.HashMap;
import java.util.Map;

public class FakeSupportCases implements SupportCasePort {

    private final Map<KycId, String> cases = new HashMap<>();

    @Override
    public void openKycReview(KycId kycId) {
        cases.put(kycId, "OPEN");
    }

    @Override
    public void resolveKycReview(KycId kycId) {
        cases.computeIfPresent(kycId, (id, status) -> "RESOLVED");
    }

    public String statusOf(KycId id) {
        return cases.get(id);
    }

    public int size() {
        return cases.size();
    }
}

package com.wallet.onboarding.application.port.out;

import com.wallet.onboarding.domain.KycId;

public interface SupportCasePort {

    void openKycReview(KycId kycId);

    void resolveKycReview(KycId kycId);
}

package com.wallet.onboarding.application;

import com.wallet.onboarding.application.port.out.KycVerificationRepositoryPort;
import com.wallet.onboarding.domain.KycId;
import com.wallet.onboarding.domain.KycNotFoundException;
import com.wallet.onboarding.domain.KycVerification;
import org.springframework.stereotype.Service;

@Service
public class GetKycVerificationUseCase {

    private final KycVerificationRepositoryPort verifications;

    public GetKycVerificationUseCase(KycVerificationRepositoryPort verifications) {
        this.verifications = verifications;
    }

    public KycVerification execute(KycId id) {
        return verifications.findById(id).orElseThrow(KycNotFoundException::new);
    }
}

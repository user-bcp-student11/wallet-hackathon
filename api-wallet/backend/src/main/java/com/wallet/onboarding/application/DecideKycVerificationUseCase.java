package com.wallet.onboarding.application;

import com.wallet.onboarding.application.port.out.KycVerificationRepositoryPort;
import com.wallet.onboarding.application.port.out.SupportCasePort;
import com.wallet.onboarding.application.port.out.WalletProvisioningPort;
import com.wallet.onboarding.domain.KycDecision;
import com.wallet.onboarding.domain.KycId;
import com.wallet.onboarding.domain.KycNotFoundException;
import com.wallet.onboarding.domain.KycVerification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DecideKycVerificationUseCase {

    private static final Logger log = LoggerFactory.getLogger(DecideKycVerificationUseCase.class);

    private final KycVerificationRepositoryPort verifications;
    private final WalletProvisioningPort wallets;
    private final SupportCasePort supportCases;

    public DecideKycVerificationUseCase(
            KycVerificationRepositoryPort verifications, WalletProvisioningPort wallets, SupportCasePort supportCases) {
        this.verifications = verifications;
        this.wallets = wallets;
        this.supportCases = supportCases;
    }

    @Transactional
    public KycVerification execute(KycId id, String decisionValue) {
        KycDecision decision = KycDecision.parse(decisionValue);
        KycVerification current = verifications.findForUpdate(id).orElseThrow(KycNotFoundException::new);
        KycVerification decided = current.decide(decision);
        if (decided.status() != current.status()) {
            verifications.updateStatus(id, decided.status());
            wallets.changeWalletStatus(decided.walletId(), decided.status());
            supportCases.resolveKycReview(id);
            log.info("kyc_decided kycId={} status={}", id.value(), decided.status());
        }
        return decided;
    }
}

package com.wallet.onboarding.application;

import com.wallet.onboarding.application.port.out.KycVerificationRepositoryPort;
import com.wallet.onboarding.application.port.out.SupportCasePort;
import com.wallet.onboarding.application.port.out.WalletProvisioningPort;
import com.wallet.onboarding.domain.KycRequest;
import com.wallet.onboarding.domain.KycStatus;
import com.wallet.onboarding.domain.KycVerification;
import com.wallet.shared.domain.WalletId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CreateKycVerificationUseCase {

    private static final Logger log = LoggerFactory.getLogger(CreateKycVerificationUseCase.class);

    private final KycVerificationRepositoryPort verifications;
    private final WalletProvisioningPort wallets;
    private final SupportCasePort supportCases;

    public CreateKycVerificationUseCase(
            KycVerificationRepositoryPort verifications, WalletProvisioningPort wallets, SupportCasePort supportCases) {
        this.verifications = verifications;
        this.wallets = wallets;
        this.supportCases = supportCases;
    }

    @Transactional
    public KycVerification execute(CreateKycCommand command) {
        KycRequest request = KycRequest.of(command.documentType(), command.document(), command.scenario());
        KycStatus status = request.scenario().resultingStatus();
        WalletId walletId = wallets.createWallet(status);
        KycVerification verification = KycVerification.register(request.scenario(), walletId, status);
        verifications.insert(verification);
        if (status == KycStatus.PENDING) {
            supportCases.openKycReview(verification.id());
        }
        log.info("kyc_created kycId={} scenario={} status={}", verification.id().value(), verification.scenario(), status);
        return verification;
    }

    public record CreateKycCommand(String documentType, String document, String scenario) {
    }
}

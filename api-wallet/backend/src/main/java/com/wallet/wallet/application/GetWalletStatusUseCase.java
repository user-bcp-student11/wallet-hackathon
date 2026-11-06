package com.wallet.wallet.application;

import com.wallet.shared.domain.UserId;
import com.wallet.wallet.application.port.out.OnboardingProgressPort;
import com.wallet.wallet.application.port.out.WalletRepositoryPort;
import com.wallet.wallet.domain.WalletState;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class GetWalletStatusUseCase {

    private final WalletRepositoryPort wallets;
    private final OnboardingProgressPort onboardingProgress;

    public GetWalletStatusUseCase(WalletRepositoryPort wallets, OnboardingProgressPort onboardingProgress) {
        this.wallets = wallets;
        this.onboardingProgress = onboardingProgress;
    }

    public WalletStatusView execute(UserId userId) {
        if (wallets.findByUser(userId).isPresent()) {
            return new WalletStatusView(WalletState.ACTIVE, null, null);
        }
        return onboardingProgress.findInProgress(userId)
                .map(progress -> new WalletStatusView(
                        WalletState.ONBOARDING_IN_PROGRESS, progress.onboardingId(), progress.currentStep()))
                .orElseGet(() -> new WalletStatusView(WalletState.NO_WALLET, null, null));
    }

    public record WalletStatusView(WalletState state, UUID onboardingId, String currentStep) {
    }
}

package com.wallet.wallet.application.port.out;

import com.wallet.shared.domain.UserId;
import java.util.Optional;
import java.util.UUID;

public interface OnboardingProgressPort {

    Optional<OnboardingProgress> findInProgress(UserId userId);

    record OnboardingProgress(UUID onboardingId, String currentStep) {
    }
}

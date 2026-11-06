package com.wallet.wallet.adapters.out.onboarding;

import com.wallet.onboarding.application.GetOnboardingUseCase;
import com.wallet.shared.domain.UserId;
import com.wallet.wallet.application.port.out.OnboardingProgressPort;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class OnboardingProgressAdapter implements OnboardingProgressPort {

    private final GetOnboardingUseCase getOnboarding;

    public OnboardingProgressAdapter(GetOnboardingUseCase getOnboarding) {
        this.getOnboarding = getOnboarding;
    }

    @Override
    public Optional<OnboardingProgress> findInProgress(UserId userId) {
        return getOnboarding.inProgressOf(userId)
                .map(view -> new OnboardingProgress(view.id(), view.currentStep()));
    }
}

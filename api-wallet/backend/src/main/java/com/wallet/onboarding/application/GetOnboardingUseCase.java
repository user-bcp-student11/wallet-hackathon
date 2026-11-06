package com.wallet.onboarding.application;

import com.wallet.onboarding.application.port.out.OnboardingRepositoryPort;
import com.wallet.onboarding.domain.OnboardingId;
import com.wallet.onboarding.domain.OnboardingNotFoundException;
import com.wallet.onboarding.domain.StepSequence;
import com.wallet.shared.domain.UserId;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class GetOnboardingUseCase {

    private final OnboardingRepositoryPort repository;
    private final StepSequence sequence;

    public GetOnboardingUseCase(OnboardingRepositoryPort repository, StepSequence sequence) {
        this.repository = repository;
        this.sequence = sequence;
    }

    public OnboardingView byId(OnboardingId id, UserId userId) {
        return repository.findByIdAndUser(id, userId)
                .map(onboarding -> OnboardingView.of(onboarding, sequence))
                .orElseThrow(OnboardingNotFoundException::new);
    }

    public Optional<OnboardingView> inProgressOf(UserId userId) {
        return repository.findInProgressByUser(userId).map(onboarding -> OnboardingView.of(onboarding, sequence));
    }
}

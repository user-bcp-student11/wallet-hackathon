package com.wallet.onboarding.application;

import com.wallet.onboarding.application.port.out.OnboardingRepositoryPort;
import com.wallet.onboarding.domain.Onboarding;
import com.wallet.onboarding.domain.OnboardingAlreadyInProgressException;
import com.wallet.onboarding.domain.OnboardingId;
import com.wallet.onboarding.domain.StepSequence;
import com.wallet.shared.domain.UserId;
import java.time.Clock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class StartOnboardingUseCase {

    private static final Logger log = LoggerFactory.getLogger(StartOnboardingUseCase.class);

    private final OnboardingRepositoryPort repository;
    private final StepSequence sequence;
    private final Clock clock;

    public StartOnboardingUseCase(OnboardingRepositoryPort repository, StepSequence sequence, Clock clock) {
        this.repository = repository;
        this.sequence = sequence;
        this.clock = clock;
    }

    public StartResult execute(UserId userId) {
        return repository.findInProgressByUser(userId)
                .map(existing -> new StartResult(OnboardingView.of(existing, sequence), false))
                .orElseGet(() -> create(userId));
    }

    private StartResult create(UserId userId) {
        Onboarding onboarding = Onboarding.start(OnboardingId.newId(), userId, clock.instant());
        try {
            repository.insert(onboarding);
        } catch (OnboardingAlreadyInProgressException concurrentStart) {
            Onboarding existing = repository.findInProgressByUser(userId).orElseThrow();
            return new StartResult(OnboardingView.of(existing, sequence), false);
        }
        log.info("onboarding_started onboardingId={}", onboarding.id().value());
        return new StartResult(OnboardingView.of(onboarding, sequence), true);
    }

    public record StartResult(OnboardingView onboarding, boolean created) {
    }
}

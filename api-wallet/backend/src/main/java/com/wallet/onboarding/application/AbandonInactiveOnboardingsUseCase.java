package com.wallet.onboarding.application;

import com.wallet.onboarding.application.port.out.OnboardingRepositoryPort;
import java.time.Clock;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AbandonInactiveOnboardingsUseCase {

    private static final Logger log = LoggerFactory.getLogger(AbandonInactiveOnboardingsUseCase.class);

    private final OnboardingRepositoryPort repository;
    private final AbandonPolicy policy;
    private final Clock clock;

    public AbandonInactiveOnboardingsUseCase(OnboardingRepositoryPort repository, AbandonPolicy policy, Clock clock) {
        this.repository = repository;
        this.policy = policy;
        this.clock = clock;
    }

    public int execute() {
        Instant cutoff = clock.instant().minus(policy.inactivityLimit());
        int abandoned = repository.abandonInProgressInactiveBefore(cutoff);
        if (abandoned > 0) {
            log.info("onboardings_abandoned count={}", abandoned);
        }
        return abandoned;
    }
}

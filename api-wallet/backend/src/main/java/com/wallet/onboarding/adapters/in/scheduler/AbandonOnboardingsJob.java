package com.wallet.onboarding.adapters.in.scheduler;

import com.wallet.onboarding.application.AbandonInactiveOnboardingsUseCase;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AbandonOnboardingsJob {

    private final AbandonInactiveOnboardingsUseCase abandonInactive;

    public AbandonOnboardingsJob(AbandonInactiveOnboardingsUseCase abandonInactive) {
        this.abandonInactive = abandonInactive;
    }

    @Scheduled(fixedDelayString = "${onboarding.abandon-check-interval:PT5M}")
    public void run() {
        abandonInactive.execute();
    }
}

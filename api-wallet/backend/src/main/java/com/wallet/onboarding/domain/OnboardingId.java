package com.wallet.onboarding.domain;

import java.util.UUID;

public record OnboardingId(UUID value) {

    public static OnboardingId newId() {
        return new OnboardingId(UUID.randomUUID());
    }

    public static OnboardingId of(UUID value) {
        return new OnboardingId(value);
    }
}

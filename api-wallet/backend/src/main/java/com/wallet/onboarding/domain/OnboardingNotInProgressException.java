package com.wallet.onboarding.domain;

public class OnboardingNotInProgressException extends RuntimeException {

    private final OnboardingStatus status;

    public OnboardingNotInProgressException(OnboardingStatus status) {
        super("El onboarding no está en curso: " + status);
        this.status = status;
    }

    public OnboardingStatus status() {
        return status;
    }
}

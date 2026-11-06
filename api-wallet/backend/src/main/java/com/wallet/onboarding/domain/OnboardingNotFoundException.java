package com.wallet.onboarding.domain;

public class OnboardingNotFoundException extends RuntimeException {

    public OnboardingNotFoundException() {
        super("Onboarding no encontrado");
    }
}

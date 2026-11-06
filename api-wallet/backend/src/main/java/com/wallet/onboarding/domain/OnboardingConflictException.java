package com.wallet.onboarding.domain;

public class OnboardingConflictException extends RuntimeException {

    public OnboardingConflictException() {
        super("El onboarding fue modificado por otra operación");
    }
}

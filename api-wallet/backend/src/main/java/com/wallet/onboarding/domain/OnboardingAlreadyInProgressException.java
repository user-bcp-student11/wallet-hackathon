package com.wallet.onboarding.domain;

public class OnboardingAlreadyInProgressException extends RuntimeException {

    public OnboardingAlreadyInProgressException() {
        super("El usuario ya tiene un onboarding en curso");
    }
}

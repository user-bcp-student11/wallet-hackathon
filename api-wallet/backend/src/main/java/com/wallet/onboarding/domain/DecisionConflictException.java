package com.wallet.onboarding.domain;

public class DecisionConflictException extends RuntimeException {

    public DecisionConflictException() {
        super("La verificación ya tiene una decisión final distinta");
    }
}

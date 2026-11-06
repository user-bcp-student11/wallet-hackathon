package com.wallet.onboarding.domain;

public class InvalidDecisionException extends RuntimeException {

    public InvalidDecisionException() {
        super("La decisión debe ser ACTIVE o REJECTED");
    }
}

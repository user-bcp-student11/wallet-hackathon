package com.wallet.onboarding.domain;

import java.util.Arrays;

/** Decisión final del operador sobre una verificación en revisión. */
public enum KycDecision {
    ACTIVE(KycStatus.ACTIVE),
    REJECTED(KycStatus.REJECTED);

    private final KycStatus finalStatus;

    KycDecision(KycStatus finalStatus) {
        this.finalStatus = finalStatus;
    }

    public KycStatus finalStatus() {
        return finalStatus;
    }

    public static KycDecision parse(String value) {
        return Arrays.stream(values())
                .filter(decision -> decision.name().equals(value))
                .findFirst()
                .orElseThrow(InvalidDecisionException::new);
    }
}

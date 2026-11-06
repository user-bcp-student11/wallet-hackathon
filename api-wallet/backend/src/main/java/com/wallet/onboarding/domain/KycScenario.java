package com.wallet.onboarding.domain;

import java.util.Arrays;
import java.util.Optional;

/** Escenario del proveedor KYC simulado. */
public enum KycScenario {
    APPROVED(KycStatus.ACTIVE),
    REJECTED(KycStatus.REJECTED),
    MANUAL_REVIEW(KycStatus.PENDING),
    UNAVAILABLE(null);

    private final KycStatus resultingStatus;

    KycScenario(KycStatus resultingStatus) {
        this.resultingStatus = resultingStatus;
    }

    /** Estado con el que queda la cuenta; con UNAVAILABLE el proveedor no responde y no hay cuenta. */
    public KycStatus resultingStatus() {
        return Optional.ofNullable(resultingStatus).orElseThrow(KycUnavailableException::new);
    }

    /** Un escenario ausente equivale a APPROVED. */
    public static KycScenario parse(String value) {
        if (value == null) {
            return APPROVED;
        }
        return Arrays.stream(values())
                .filter(scenario -> scenario.name().equals(value))
                .findFirst()
                .orElseThrow(() -> new InvalidKycRequestException("scenario"));
    }
}

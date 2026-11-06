package com.wallet.onboarding.domain;

import java.util.Objects;
import java.util.UUID;

public record KycId(String value) {

    public KycId {
        Objects.requireNonNull(value, "value");
        if (value.isBlank()) {
            throw new IllegalArgumentException("El identificador de la verificación no puede estar vacío");
        }
    }

    public static KycId newId() {
        return new KycId("kyc-" + UUID.randomUUID());
    }

    public static KycId of(String value) {
        return new KycId(value);
    }
}

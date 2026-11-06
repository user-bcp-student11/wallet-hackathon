package com.wallet.onboarding.domain;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

public enum StepType {
    PHONE,
    IDENTITY,
    CONFIRMATION;

    public String code() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static Optional<StepType> fromCode(String code) {
        return Arrays.stream(values()).filter(type -> type.code().equals(code)).findFirst();
    }
}

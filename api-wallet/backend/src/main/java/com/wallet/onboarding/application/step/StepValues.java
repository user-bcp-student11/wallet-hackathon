package com.wallet.onboarding.application.step;

import java.util.Map;

public record StepValues(Map<String, String> raw) {

    public StepValues {
        raw = raw == null ? Map.of() : Map.copyOf(raw);
    }

    public String get(String field) {
        String value = raw.get(field);
        return value == null ? "" : value.trim();
    }
}

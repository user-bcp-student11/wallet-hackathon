package com.wallet.onboarding.domain;

public record StepDefinition(StepType type, String title, String instruction) {

    public String code() {
        return type.code();
    }
}

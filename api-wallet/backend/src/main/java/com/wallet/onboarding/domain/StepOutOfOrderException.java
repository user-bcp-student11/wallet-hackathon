package com.wallet.onboarding.domain;

public class StepOutOfOrderException extends RuntimeException {

    private final StepType currentStep;

    public StepOutOfOrderException(StepType currentStep) {
        super("El paso enviado no es el paso actual: " + currentStep.code());
        this.currentStep = currentStep;
    }

    public StepType currentStep() {
        return currentStep;
    }
}

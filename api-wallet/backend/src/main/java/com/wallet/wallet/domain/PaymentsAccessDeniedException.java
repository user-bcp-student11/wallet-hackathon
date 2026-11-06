package com.wallet.wallet.domain;

public class PaymentsAccessDeniedException extends RuntimeException {

    private final WalletState state;
    private final String currentStep;

    public PaymentsAccessDeniedException(WalletState state, String currentStep) {
        super("Acceso a pagos denegado: " + state);
        this.state = state;
        this.currentStep = currentStep;
    }

    public WalletState state() {
        return state;
    }

    public String currentStep() {
        return currentStep;
    }
}

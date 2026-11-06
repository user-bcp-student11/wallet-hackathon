package com.wallet.onboarding.domain;

public class KycNotFoundException extends RuntimeException {

    public KycNotFoundException() {
        super("Verificación no encontrada");
    }
}

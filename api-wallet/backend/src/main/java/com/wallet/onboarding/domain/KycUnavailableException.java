package com.wallet.onboarding.domain;

public class KycUnavailableException extends RuntimeException {

    public KycUnavailableException() {
        super("El proveedor KYC no está disponible");
    }
}

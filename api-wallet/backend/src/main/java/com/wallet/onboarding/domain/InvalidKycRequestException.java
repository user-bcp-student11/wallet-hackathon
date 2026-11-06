package com.wallet.onboarding.domain;

public class InvalidKycRequestException extends RuntimeException {

    public InvalidKycRequestException(String field) {
        super("Campo inválido: " + field);
    }
}

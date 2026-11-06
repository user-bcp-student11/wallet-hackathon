package com.wallet.onboarding.domain;

/** Datos válidos para pedir una verificación: solo documentos ficticios con prefijo TEST-. */
public record KycRequest(String documentType, String document, KycScenario scenario) {

    static final String DOCUMENT_TYPE = "TEST";
    static final String DOCUMENT_PREFIX = "TEST-";
    static final int MAX_LENGTH = 200;

    public static KycRequest of(String documentType, String document, String scenario) {
        if (!DOCUMENT_TYPE.equals(documentType)) {
            throw new InvalidKycRequestException("documentType");
        }
        if (document == null || !document.startsWith(DOCUMENT_PREFIX) || document.length() > MAX_LENGTH) {
            throw new InvalidKycRequestException("document");
        }
        return new KycRequest(documentType, document, KycScenario.parse(scenario));
    }
}

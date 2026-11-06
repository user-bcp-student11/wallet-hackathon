package com.wallet.support;

import com.wallet.onboarding.domain.StepDefinition;
import com.wallet.onboarding.domain.StepSequence;
import com.wallet.onboarding.domain.StepType;
import java.util.List;
import java.util.Map;

public final class Fixtures {

    public static final String OTP_CODE = "123456";

    public static final StepSequence DEFAULT_SEQUENCE = new StepSequence(List.of(
            new StepDefinition(StepType.PHONE, "Verifica tu celular", "Ingresa tu celular y el código"),
            new StepDefinition(StepType.IDENTITY, "Tus datos personales", "Ingresa tus datos"),
            new StepDefinition(StepType.CONFIRMATION, "Activa tu wallet", "Acepta los términos")));

    private Fixtures() {
    }

    public static Map<String, String> validPhoneStep() {
        return Map.of("phoneNumber", "912345678", "otpCode", OTP_CODE);
    }

    public static Map<String, String> validIdentityStep() {
        return Map.of("documentType", "DNI", "documentNumber", "12345678", "firstName", "Ana",
                "lastName", "Quispe", "birthDate", "1990-05-20");
    }

    public static Map<String, String> validConfirmationStep() {
        return Map.of("acceptedTerms", "true");
    }
}

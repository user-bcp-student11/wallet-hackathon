package com.wallet.onboarding.domain;

import java.util.Arrays;
import java.util.Optional;
import java.util.regex.Pattern;

public enum DocumentType {
    DNI(Pattern.compile("\\d{8}"), "El DNI debe tener 8 dígitos."),
    CE(Pattern.compile("\\d{9}"), "El carné de extranjería debe tener 9 dígitos.");

    private final Pattern format;
    private final String invalidFormatMessage;

    DocumentType(Pattern format, String invalidFormatMessage) {
        this.format = format;
        this.invalidFormatMessage = invalidFormatMessage;
    }

    public static Optional<DocumentType> parse(String value) {
        return Arrays.stream(values()).filter(type -> type.name().equals(value)).findFirst();
    }

    public Optional<String> validateNumber(String number) {
        if (number == null || number.isBlank()) {
            return Optional.of("Ingresa tu número de documento.");
        }
        return format.matcher(number).matches() ? Optional.empty() : Optional.of(invalidFormatMessage);
    }
}

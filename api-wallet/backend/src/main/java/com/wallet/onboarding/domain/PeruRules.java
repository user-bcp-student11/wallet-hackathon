package com.wallet.onboarding.domain;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.Period;
import java.util.Optional;
import java.util.regex.Pattern;

public final class PeruRules {

    public static final int ADULT_AGE = 18;
    private static final Pattern DIGITS = Pattern.compile("\\d+");

    private PeruRules() {
    }

    public static Optional<String> phone(String phone) {
        if (phone == null || phone.isBlank()) {
            return Optional.of("Ingresa tu número de celular.");
        }
        if (!DIGITS.matcher(phone).matches() || phone.length() != 9) {
            return Optional.of("El celular debe tener 9 dígitos.");
        }
        return phone.startsWith("9") ? Optional.empty() : Optional.of("El celular debe empezar con 9.");
    }

    public static Optional<String> adult(String isoBirthDate, LocalDate today) {
        if (isoBirthDate == null || isoBirthDate.isBlank()) {
            return Optional.of("Ingresa tu fecha de nacimiento.");
        }
        LocalDate birthDate;
        try {
            birthDate = LocalDate.parse(isoBirthDate);
        } catch (DateTimeException e) {
            return Optional.of("Ingresa tu fecha de nacimiento con el formato AAAA-MM-DD.");
        }
        if (birthDate.isAfter(today)) {
            return Optional.of("La fecha de nacimiento no puede ser futura.");
        }
        return Period.between(birthDate, today).getYears() >= ADULT_AGE
                ? Optional.empty()
                : Optional.of("Debes ser mayor de 18 años para registrarte.");
    }

    public static Optional<String> requiredName(String name, String emptyMessage) {
        return name == null || name.isBlank() ? Optional.of(emptyMessage) : Optional.empty();
    }
}

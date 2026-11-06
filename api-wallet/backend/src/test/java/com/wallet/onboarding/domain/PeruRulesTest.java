package com.wallet.onboarding.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class PeruRulesTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 6);

    @Test
    @DisplayName("Scenario: Celular con formato inválido")
    void phoneStartingWithEightIsRejected() {
        assertThat(PeruRules.phone("812345678")).contains("El celular debe empezar con 9.");
    }

    @ParameterizedTest
    @ValueSource(strings = {"91234567", "9123456789", "9123abc78"})
    @DisplayName("Scenario: Celular con formato inválido (longitud o caracteres)")
    void phoneWithWrongLengthOrCharactersIsRejected(String phone) {
        assertThat(PeruRules.phone(phone)).contains("El celular debe tener 9 dígitos.");
    }

    @Test
    @DisplayName("Scenario: Celular válido")
    void validPhoneIsAccepted() {
        assertThat(PeruRules.phone("912345678")).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"1234567", "123456789"})
    @DisplayName("Scenario: DNI con longitud incorrecta")
    void dniWithWrongLengthIsRejected(String dni) {
        assertThat(DocumentType.DNI.validateNumber(dni)).contains("El DNI debe tener 8 dígitos.");
    }

    @Test
    @DisplayName("Scenario: DNI válido")
    void validDniIsAccepted() {
        assertThat(DocumentType.DNI.validateNumber("12345678")).isEmpty();
    }

    @Test
    @DisplayName("Scenario: Documento CE válido")
    void validCeIsAccepted() {
        assertThat(DocumentType.CE.validateNumber("123456789")).isEmpty();
    }

    @Test
    @DisplayName("Scenario: Documento CE con formato inválido")
    void ceWithWrongFormatIsRejected() {
        assertThat(DocumentType.CE.validateNumber("12345")).isPresent();
    }

    @Test
    @DisplayName("Scenario: Usuario menor de edad")
    void minorIsRejected() {
        assertThat(PeruRules.adult("2008-11-07", TODAY)).contains("Debes ser mayor de 18 años para registrarte.");
    }

    @Test
    @DisplayName("Scenario: Mayor de edad el día que cumple 18")
    void personTurningEighteenTodayIsAccepted() {
        assertThat(PeruRules.adult("2008-11-06", TODAY)).isEmpty();
    }

    @Test
    @DisplayName("Scenario: Fecha de nacimiento inválida")
    void malformedOrFutureBirthDateIsRejected() {
        assertThat(PeruRules.adult("06/11/1990", TODAY)).isPresent();
        assertThat(PeruRules.adult("2027-01-01", TODAY)).isPresent();
    }

    @Test
    @DisplayName("Scenario: Nombres vacíos")
    void blankNameIsRejected() {
        assertThat(PeruRules.requiredName("  ", "Ingresa tus nombres.")).contains("Ingresa tus nombres.");
        assertThat(PeruRules.requiredName("Ana", "Ingresa tus nombres.")).isEmpty();
    }
}

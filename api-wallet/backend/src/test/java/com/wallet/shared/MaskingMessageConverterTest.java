package com.wallet.shared;

import static org.assertj.core.api.Assertions.assertThat;

import com.wallet.shared.logging.MaskingMessageConverter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class MaskingMessageConverterTest {

    @Test
    @DisplayName("Scenario: Registro de errores de validación (enmascarado)")
    void longNumbersAndDatesAreMasked() {
        String masked = MaskingMessageConverter.mask("dni=12345678 celular=912345678 nacimiento=1990-05-20 otp=123456");

        assertThat(masked).isEqualTo("dni=*** celular=*** nacimiento=****-**-** otp=***");
    }

    @Test
    @DisplayName("Scenario: Identificadores UUID no se alteran")
    void uuidsAreKept() {
        String message = "onboardingId=12345678-1234-1234-1234-123456789012";

        assertThat(MaskingMessageConverter.mask(message)).isEqualTo(message);
    }
}

package com.wallet.shared.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wallet.shared.web.MockLatency.InvalidMockLatencyException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class MockLatencyTest {

    @Test
    @DisplayName("Scenario: Sin header ni query la latencia es 0")
    void defaultsToZero() {
        assertThat(MockLatency.resolve(null, null).millis()).isZero();
    }

    @Test
    @DisplayName("Scenario: El header tiene prioridad sobre el query param")
    void headerWinsOverQuery() {
        assertThat(MockLatency.resolve("200", "900").millis()).isEqualTo(200);
        assertThat(MockLatency.resolve(null, "900").millis()).isEqualTo(900);
    }

    @Test
    @DisplayName("Scenario: Los límites 0 y 5000 son válidos")
    void bounds() {
        assertThat(MockLatency.resolve("0", null).millis()).isZero();
        assertThat(MockLatency.resolve("5000", null).millis()).isEqualTo(5000);
    }

    @ParameterizedTest
    @ValueSource(strings = {"5001", "-1", "abc", "", "1.5", "+10", "10000"})
    @DisplayName("Scenario: Valor inválido")
    void invalidValuesAreRejected(String value) {
        assertThatThrownBy(() -> MockLatency.resolve(value, null)).isInstanceOf(InvalidMockLatencyException.class);
        assertThatThrownBy(() -> MockLatency.resolve(null, value)).isInstanceOf(InvalidMockLatencyException.class);
    }

    @Test
    @DisplayName("Scenario: Ambos valores deben ser válidos aunque el header gane")
    void bothValuesMustBeValid() {
        assertThatThrownBy(() -> MockLatency.resolve("100", "9999")).isInstanceOf(InvalidMockLatencyException.class);
    }
}

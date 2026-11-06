package com.wallet.shared.web;

import java.util.Optional;
import java.util.regex.Pattern;

/** Demora simulada por solicitud: entero de 0 a 5000 ms; el header tiene prioridad sobre el query param. */
public record MockLatency(int millis) {

    public static final int MAX_MILLIS = 5000;
    private static final Pattern DIGITS = Pattern.compile("\\d{1,4}");

    public static MockLatency none() {
        return new MockLatency(0);
    }

    /** Ambos valores, si se envían, deben ser válidos. */
    public static MockLatency resolve(String header, String query) {
        Optional<MockLatency> fromHeader = parse(header);
        Optional<MockLatency> fromQuery = parse(query);
        return fromHeader.or(() -> fromQuery).orElseGet(MockLatency::none);
    }

    private static Optional<MockLatency> parse(String value) {
        if (value == null) {
            return Optional.empty();
        }
        String trimmed = value.trim();
        if (!DIGITS.matcher(trimmed).matches() || Integer.parseInt(trimmed) > MAX_MILLIS) {
            throw new InvalidMockLatencyException();
        }
        return Optional.of(new MockLatency(Integer.parseInt(trimmed)));
    }

    public static class InvalidMockLatencyException extends RuntimeException {

        InvalidMockLatencyException() {
            super("La latencia simulada debe ser un entero de 0 a " + MAX_MILLIS);
        }
    }
}

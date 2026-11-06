package com.wallet.onboarding.domain;

import java.util.List;

public class ValidationFailedException extends RuntimeException {

    private final transient List<FieldError> errors;

    public ValidationFailedException(List<FieldError> errors) {
        super("Datos inválidos en " + errors.size() + " campo(s)");
        this.errors = List.copyOf(errors);
    }

    public List<FieldError> errors() {
        return errors;
    }
}

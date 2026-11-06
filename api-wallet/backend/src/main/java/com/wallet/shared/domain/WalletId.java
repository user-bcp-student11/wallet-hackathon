package com.wallet.shared.domain;

import java.util.Objects;
import java.util.UUID;

public record WalletId(String value) {

    public WalletId {
        Objects.requireNonNull(value, "value");
        if (value.isBlank()) {
            throw new IllegalArgumentException("El identificador de la wallet no puede estar vacío");
        }
    }

    public static WalletId newId() {
        return new WalletId("wallet-" + UUID.randomUUID());
    }

    public static WalletId of(String value) {
        return new WalletId(value);
    }
}

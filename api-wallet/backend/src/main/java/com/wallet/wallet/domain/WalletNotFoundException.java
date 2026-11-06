package com.wallet.wallet.domain;

public class WalletNotFoundException extends RuntimeException {

    public WalletNotFoundException() {
        super("Wallet no encontrada");
    }
}

package com.wallet.wallet.domain;

import com.wallet.shared.domain.WalletId;

/** Importes en céntimos de PEN. */
public record Wallet(WalletId id, WalletStatus status, long balance, long reserved) {

    public static Wallet open(WalletId id, WalletStatus status) {
        return new Wallet(id, status, 0, 0);
    }

    public long available() {
        return balance - reserved;
    }
}

package com.wallet.wallet.domain;

import com.wallet.shared.domain.UserId;
import java.time.Instant;

public record Wallet(UserId userId, WalletStatus status, Instant activatedAt) {

    public static Wallet activate(UserId userId, Instant now) {
        return new Wallet(userId, WalletStatus.ACTIVE, now);
    }
}

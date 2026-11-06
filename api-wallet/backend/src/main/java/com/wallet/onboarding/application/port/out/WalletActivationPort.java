package com.wallet.onboarding.application.port.out;

import com.wallet.shared.domain.UserId;

public interface WalletActivationPort {

    void activate(UserId userId);
}

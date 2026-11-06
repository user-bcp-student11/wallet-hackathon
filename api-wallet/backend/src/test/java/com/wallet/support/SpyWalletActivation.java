package com.wallet.support;

import com.wallet.onboarding.application.port.out.WalletActivationPort;
import com.wallet.shared.domain.UserId;
import java.util.ArrayList;
import java.util.List;

public class SpyWalletActivation implements WalletActivationPort {

    private final List<UserId> activated = new ArrayList<>();

    @Override
    public void activate(UserId userId) {
        activated.add(userId);
    }

    public List<UserId> activated() {
        return activated;
    }
}

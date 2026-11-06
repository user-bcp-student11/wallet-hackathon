package com.wallet.onboarding.adapters.out.wallet;

import com.wallet.onboarding.application.port.out.WalletActivationPort;
import com.wallet.shared.domain.UserId;
import com.wallet.wallet.application.ActivateWalletUseCase;
import org.springframework.stereotype.Component;

@Component
public class WalletActivationAdapter implements WalletActivationPort {

    private final ActivateWalletUseCase activateWallet;

    public WalletActivationAdapter(ActivateWalletUseCase activateWallet) {
        this.activateWallet = activateWallet;
    }

    @Override
    public void activate(UserId userId) {
        activateWallet.execute(userId);
    }
}

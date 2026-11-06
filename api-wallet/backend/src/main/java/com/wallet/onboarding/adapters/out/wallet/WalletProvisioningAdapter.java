package com.wallet.onboarding.adapters.out.wallet;

import com.wallet.onboarding.application.port.out.WalletProvisioningPort;
import com.wallet.onboarding.domain.KycStatus;
import com.wallet.shared.domain.WalletId;
import com.wallet.wallet.application.ChangeWalletStatusUseCase;
import com.wallet.wallet.application.CreateWalletUseCase;
import com.wallet.wallet.domain.WalletStatus;
import org.springframework.stereotype.Component;

@Component
public class WalletProvisioningAdapter implements WalletProvisioningPort {

    private final CreateWalletUseCase createWallet;
    private final ChangeWalletStatusUseCase changeWalletStatus;

    public WalletProvisioningAdapter(CreateWalletUseCase createWallet, ChangeWalletStatusUseCase changeWalletStatus) {
        this.createWallet = createWallet;
        this.changeWalletStatus = changeWalletStatus;
    }

    @Override
    public WalletId createWallet(KycStatus status) {
        return createWallet.execute(toWalletStatus(status));
    }

    @Override
    public void changeWalletStatus(WalletId walletId, KycStatus status) {
        changeWalletStatus.execute(walletId, toWalletStatus(status));
    }

    private static WalletStatus toWalletStatus(KycStatus status) {
        return switch (status) {
            case ACTIVE -> WalletStatus.ACTIVE;
            case PENDING -> WalletStatus.PENDING;
            case REJECTED -> WalletStatus.REJECTED;
        };
    }
}

package com.wallet.onboarding.application.port.out;

import com.wallet.onboarding.domain.KycStatus;
import com.wallet.shared.domain.WalletId;

public interface WalletProvisioningPort {

    /** Crea una wallet con saldo cero en el estado indicado. */
    WalletId createWallet(KycStatus status);

    void changeWalletStatus(WalletId walletId, KycStatus status);
}

package com.wallet.support;

import com.wallet.onboarding.application.port.out.WalletProvisioningPort;
import com.wallet.onboarding.domain.KycStatus;
import com.wallet.shared.domain.WalletId;
import java.util.HashMap;
import java.util.Map;

public class FakeWalletProvisioning implements WalletProvisioningPort {

    private final Map<WalletId, KycStatus> wallets = new HashMap<>();

    @Override
    public WalletId createWallet(KycStatus status) {
        WalletId id = WalletId.newId();
        wallets.put(id, status);
        return id;
    }

    @Override
    public void changeWalletStatus(WalletId walletId, KycStatus status) {
        wallets.put(walletId, status);
    }

    public KycStatus statusOf(WalletId id) {
        return wallets.get(id);
    }

    public int size() {
        return wallets.size();
    }
}

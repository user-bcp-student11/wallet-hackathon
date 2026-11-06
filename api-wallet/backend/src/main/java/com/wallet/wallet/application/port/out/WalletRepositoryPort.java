package com.wallet.wallet.application.port.out;

import com.wallet.shared.domain.WalletId;
import com.wallet.wallet.domain.Wallet;
import com.wallet.wallet.domain.WalletStatus;
import java.util.Optional;

public interface WalletRepositoryPort {

    void insert(Wallet wallet);

    Optional<Wallet> findById(WalletId id);

    void updateStatus(WalletId id, WalletStatus status);
}

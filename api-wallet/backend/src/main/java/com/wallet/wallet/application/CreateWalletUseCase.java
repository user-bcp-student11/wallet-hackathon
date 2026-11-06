package com.wallet.wallet.application;

import com.wallet.shared.domain.WalletId;
import com.wallet.wallet.application.port.out.WalletRepositoryPort;
import com.wallet.wallet.domain.Wallet;
import com.wallet.wallet.domain.WalletStatus;
import org.springframework.stereotype.Service;

@Service
public class CreateWalletUseCase {

    private final WalletRepositoryPort repository;

    public CreateWalletUseCase(WalletRepositoryPort repository) {
        this.repository = repository;
    }

    public WalletId execute(WalletStatus status) {
        Wallet wallet = Wallet.open(WalletId.newId(), status);
        repository.insert(wallet);
        return wallet.id();
    }
}

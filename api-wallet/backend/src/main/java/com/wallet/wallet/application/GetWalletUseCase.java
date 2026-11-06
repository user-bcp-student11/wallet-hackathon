package com.wallet.wallet.application;

import com.wallet.shared.domain.WalletId;
import com.wallet.wallet.application.port.out.WalletRepositoryPort;
import com.wallet.wallet.domain.Wallet;
import com.wallet.wallet.domain.WalletNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class GetWalletUseCase {

    private final WalletRepositoryPort repository;

    public GetWalletUseCase(WalletRepositoryPort repository) {
        this.repository = repository;
    }

    public Wallet execute(WalletId id) {
        return repository.findById(id).orElseThrow(WalletNotFoundException::new);
    }
}

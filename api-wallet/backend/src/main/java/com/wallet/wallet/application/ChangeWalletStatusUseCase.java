package com.wallet.wallet.application;

import com.wallet.shared.domain.WalletId;
import com.wallet.wallet.application.port.out.WalletRepositoryPort;
import com.wallet.wallet.domain.WalletNotFoundException;
import com.wallet.wallet.domain.WalletStatus;
import org.springframework.stereotype.Service;

@Service
public class ChangeWalletStatusUseCase {

    private final WalletRepositoryPort repository;

    public ChangeWalletStatusUseCase(WalletRepositoryPort repository) {
        this.repository = repository;
    }

    public void execute(WalletId id, WalletStatus status) {
        repository.findById(id).orElseThrow(WalletNotFoundException::new);
        repository.updateStatus(id, status);
    }
}

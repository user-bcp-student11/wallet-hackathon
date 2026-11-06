package com.wallet.wallet.application;

import com.wallet.shared.domain.UserId;
import com.wallet.wallet.application.port.out.WalletRepositoryPort;
import com.wallet.wallet.domain.Wallet;
import java.time.Clock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ActivateWalletUseCase {

    private static final Logger log = LoggerFactory.getLogger(ActivateWalletUseCase.class);

    private final WalletRepositoryPort repository;
    private final Clock clock;

    public ActivateWalletUseCase(WalletRepositoryPort repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional
    public void execute(UserId userId) {
        repository.insertIfAbsent(Wallet.activate(userId, clock.instant()));
        log.info("wallet_activated userId={}", userId.value());
    }
}

package com.wallet.wallet.application.port.out;

import com.wallet.shared.domain.UserId;
import com.wallet.wallet.domain.Wallet;
import java.util.Optional;

public interface WalletRepositoryPort {

    Optional<Wallet> findByUser(UserId userId);

    /** Crea la wallet si no existe; repetirla no tiene efecto. */
    void insertIfAbsent(Wallet wallet);
}

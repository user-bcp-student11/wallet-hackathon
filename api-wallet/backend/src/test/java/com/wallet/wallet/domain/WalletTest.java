package com.wallet.wallet.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.wallet.shared.domain.WalletId;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class WalletTest {

    @Test
    @DisplayName("Scenario: Una wallet nueva abre con saldo cero")
    void newWalletStartsWithZeroBalance() {
        Wallet wallet = Wallet.open(WalletId.newId(), WalletStatus.ACTIVE);

        assertThat(wallet.balance()).isZero();
        assertThat(wallet.reserved()).isZero();
        assertThat(wallet.available()).isZero();
    }

    @Test
    @DisplayName("Scenario: available = balance - reserved")
    void availableIsBalanceMinusReserved() {
        Wallet wallet = new Wallet(WalletId.of("wallet-demo"), WalletStatus.ACTIVE, 100000, 2500);

        assertThat(wallet.available()).isEqualTo(97500);
    }
}

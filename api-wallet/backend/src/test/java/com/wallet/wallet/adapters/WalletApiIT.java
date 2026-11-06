package com.wallet.wallet.adapters;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.wallet.support.ApiTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class WalletApiIT extends ApiTest {

    @Test
    @DisplayName("Scenario: wallet-demo empieza ACTIVE con 100000")
    void walletDemoIsPreloadedWithFunds() throws Exception {
        getWallet("wallet-demo")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("wallet-demo"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.balance").value(100000))
                .andExpect(jsonPath("$.reserved").value(0))
                .andExpect(jsonPath("$.available").value(100000))
                .andExpect(jsonPath("$.currency").value("PEN"));
    }

    @Test
    @DisplayName("Scenario: available = balance - reserved")
    void availableIsBalanceMinusReserved() throws Exception {
        jdbc.sql("INSERT INTO wallets (id, status, balance, reserved) VALUES ('wallet-reserva', 'ACTIVE', 50000, 12000)")
                .update();

        getWallet("wallet-reserva")
                .andExpect(jsonPath("$.balance").value(50000))
                .andExpect(jsonPath("$.reserved").value(12000))
                .andExpect(jsonPath("$.available").value(38000));
    }

    @Test
    @DisplayName("Scenario: Wallet inexistente devuelve 404 NOT_FOUND")
    void unknownWalletReturns404() throws Exception {
        getWallet("wallet-inexistente")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
    }
}

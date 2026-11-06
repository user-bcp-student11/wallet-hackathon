package com.wallet.wallet.adapters.in.web;

import com.wallet.shared.domain.WalletId;
import com.wallet.wallet.application.GetWalletUseCase;
import com.wallet.wallet.domain.Wallet;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/wallets")
public class WalletController {

    private static final String CURRENCY = "PEN";

    private final GetWalletUseCase getWallet;

    public WalletController(GetWalletUseCase getWallet) {
        this.getWallet = getWallet;
    }

    @GetMapping("/{id}")
    public WalletResponse get(@PathVariable String id) {
        return WalletResponse.from(getWallet.execute(WalletId.of(id)));
    }

    public record WalletResponse(String id, String status, long balance, long reserved, long available, String currency) {

        static WalletResponse from(Wallet wallet) {
            return new WalletResponse(wallet.id().value(), wallet.status().name(), wallet.balance(),
                    wallet.reserved(), wallet.available(), CURRENCY);
        }
    }
}

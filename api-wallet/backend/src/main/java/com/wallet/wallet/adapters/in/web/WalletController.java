package com.wallet.wallet.adapters.in.web;

import com.wallet.shared.domain.UserId;
import com.wallet.shared.web.UserHeader;
import com.wallet.wallet.application.CheckPaymentsAccessUseCase;
import com.wallet.wallet.application.GetWalletStatusUseCase;
import com.wallet.wallet.application.GetWalletStatusUseCase.WalletStatusView;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/wallet")
public class WalletController {

    private final GetWalletStatusUseCase getWalletStatus;
    private final CheckPaymentsAccessUseCase checkPaymentsAccess;

    public WalletController(GetWalletStatusUseCase getWalletStatus, CheckPaymentsAccessUseCase checkPaymentsAccess) {
        this.getWalletStatus = getWalletStatus;
        this.checkPaymentsAccess = checkPaymentsAccess;
    }

    @GetMapping
    public WalletStatusView status(@RequestHeader(UserHeader.NAME) UUID userId) {
        return getWalletStatus.execute(UserId.of(userId));
    }

    @GetMapping("/payments-access")
    public PaymentsAccessResponse paymentsAccess(@RequestHeader(UserHeader.NAME) UUID userId) {
        checkPaymentsAccess.execute(UserId.of(userId));
        return new PaymentsAccessResponse(true);
    }

    public record PaymentsAccessResponse(boolean enabled) {
    }
}

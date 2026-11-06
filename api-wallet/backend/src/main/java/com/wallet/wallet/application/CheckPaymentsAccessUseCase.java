package com.wallet.wallet.application;

import com.wallet.shared.domain.UserId;
import com.wallet.wallet.application.GetWalletStatusUseCase.WalletStatusView;
import com.wallet.wallet.domain.PaymentsAccessDeniedException;
import com.wallet.wallet.domain.WalletState;
import org.springframework.stereotype.Service;

@Service
public class CheckPaymentsAccessUseCase {

    private final GetWalletStatusUseCase walletStatus;

    public CheckPaymentsAccessUseCase(GetWalletStatusUseCase walletStatus) {
        this.walletStatus = walletStatus;
    }

    public void execute(UserId userId) {
        WalletStatusView status = walletStatus.execute(userId);
        if (status.state() != WalletState.ACTIVE) {
            throw new PaymentsAccessDeniedException(status.state(), status.currentStep());
        }
    }
}

package com.wallet.wallet.adapters.in.web;

import com.wallet.wallet.domain.PaymentsAccessDeniedException;
import java.net.URI;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class WalletProblemAdvice {

    @ExceptionHandler(PaymentsAccessDeniedException.class)
    ProblemDetail paymentsAccessDenied(PaymentsAccessDeniedException e) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN,
                "Completa tu registro para activar tu wallet y poder pagar.");
        problem.setType(URI.create("/problems/wallet-not-active"));
        problem.setTitle("Wallet no activa");
        problem.setProperty("walletState", e.state().name());
        if (e.currentStep() != null) {
            problem.setProperty("currentStep", e.currentStep());
        }
        return problem;
    }
}

package com.wallet.onboarding.adapters.in.web;

import com.wallet.onboarding.domain.DecisionConflictException;
import com.wallet.onboarding.domain.InvalidDecisionException;
import com.wallet.onboarding.domain.InvalidKycRequestException;
import com.wallet.onboarding.domain.KycNotFoundException;
import com.wallet.onboarding.domain.KycUnavailableException;
import com.wallet.shared.web.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackageClasses = KycController.class)
public class KycErrorAdvice {

    @ExceptionHandler(InvalidKycRequestException.class)
    ResponseEntity<ErrorResponse> invalidRequest() {
        return error(HttpStatus.BAD_REQUEST, "INVALID_REQUEST");
    }

    @ExceptionHandler(InvalidDecisionException.class)
    ResponseEntity<ErrorResponse> invalidDecision() {
        return error(HttpStatus.BAD_REQUEST, "INVALID_DECISION");
    }

    @ExceptionHandler(KycNotFoundException.class)
    ResponseEntity<ErrorResponse> notFound() {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND");
    }

    @ExceptionHandler(DecisionConflictException.class)
    ResponseEntity<ErrorResponse> decisionConflict() {
        return error(HttpStatus.CONFLICT, "DECISION_CONFLICT");
    }

    @ExceptionHandler(KycUnavailableException.class)
    ResponseEntity<ErrorResponse> unavailable() {
        return error(HttpStatus.SERVICE_UNAVAILABLE, "KYC_UNAVAILABLE");
    }

    private static ResponseEntity<ErrorResponse> error(HttpStatus status, String code) {
        return ResponseEntity.status(status).body(new ErrorResponse(code));
    }
}

package com.wallet.wallet.adapters.in.web;

import com.wallet.shared.web.ErrorResponse;
import com.wallet.wallet.domain.WalletNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackageClasses = WalletController.class)
public class WalletErrorAdvice {

    @ExceptionHandler(WalletNotFoundException.class)
    ResponseEntity<ErrorResponse> notFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse("NOT_FOUND"));
    }
}

package com.wallet.onboarding.application.port.out;

public interface OtpProviderPort {

    void sendCode(String phoneNumber);

    boolean verify(String phoneNumber, String code);
}

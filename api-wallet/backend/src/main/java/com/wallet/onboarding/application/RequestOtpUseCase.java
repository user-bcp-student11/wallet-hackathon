package com.wallet.onboarding.application;

import com.wallet.onboarding.application.port.out.OnboardingRepositoryPort;
import com.wallet.onboarding.application.port.out.OtpProviderPort;
import com.wallet.onboarding.domain.FieldError;
import com.wallet.onboarding.domain.Onboarding;
import com.wallet.onboarding.domain.OnboardingId;
import com.wallet.onboarding.domain.OnboardingNotFoundException;
import com.wallet.onboarding.domain.PeruRules;
import com.wallet.onboarding.domain.ValidationFailedException;
import com.wallet.shared.domain.UserId;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class RequestOtpUseCase {

    private final OnboardingRepositoryPort repository;
    private final OtpProviderPort otpProvider;

    public RequestOtpUseCase(OnboardingRepositoryPort repository, OtpProviderPort otpProvider) {
        this.repository = repository;
        this.otpProvider = otpProvider;
    }

    public void execute(OnboardingId onboardingId, UserId userId, String phoneNumber) {
        Onboarding onboarding = repository.findByIdAndUser(onboardingId, userId)
                .orElseThrow(OnboardingNotFoundException::new);
        onboarding.requireInProgress();
        String phone = phoneNumber == null ? "" : phoneNumber.trim();
        PeruRules.phone(phone).ifPresent(message -> {
            throw new ValidationFailedException(List.of(new FieldError("phoneNumber", message)));
        });
        otpProvider.sendCode(phone);
    }
}

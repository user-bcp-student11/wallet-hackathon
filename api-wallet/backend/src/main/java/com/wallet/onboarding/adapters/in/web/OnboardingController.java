package com.wallet.onboarding.adapters.in.web;

import com.wallet.onboarding.adapters.in.web.OnboardingRequests.RequestOtpRequest;
import com.wallet.onboarding.adapters.in.web.OnboardingRequests.SubmitStepRequest;
import com.wallet.onboarding.application.GetOnboardingUseCase;
import com.wallet.onboarding.application.OnboardingView;
import com.wallet.onboarding.application.RequestOtpUseCase;
import com.wallet.onboarding.application.StartOnboardingUseCase;
import com.wallet.onboarding.application.StartOnboardingUseCase.StartResult;
import com.wallet.onboarding.application.SubmitStepUseCase;
import com.wallet.onboarding.application.SubmitStepUseCase.SubmitStepCommand;
import com.wallet.onboarding.domain.OnboardingId;
import com.wallet.shared.domain.UserId;
import com.wallet.shared.web.UserHeader;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/onboardings")
public class OnboardingController {

    private final StartOnboardingUseCase startOnboarding;
    private final GetOnboardingUseCase getOnboarding;
    private final SubmitStepUseCase submitStep;
    private final RequestOtpUseCase requestOtp;

    public OnboardingController(
            StartOnboardingUseCase startOnboarding,
            GetOnboardingUseCase getOnboarding,
            SubmitStepUseCase submitStep,
            RequestOtpUseCase requestOtp) {
        this.startOnboarding = startOnboarding;
        this.getOnboarding = getOnboarding;
        this.submitStep = submitStep;
        this.requestOtp = requestOtp;
    }

    @PostMapping
    public ResponseEntity<OnboardingView> start(@RequestHeader(UserHeader.NAME) UUID userId) {
        StartResult result = startOnboarding.execute(UserId.of(userId));
        if (!result.created()) {
            return ResponseEntity.ok(result.onboarding());
        }
        return ResponseEntity.created(URI.create("/api/v1/onboardings/" + result.onboarding().id()))
                .body(result.onboarding());
    }

    @GetMapping("/{id}")
    public OnboardingView get(@RequestHeader(UserHeader.NAME) UUID userId, @PathVariable UUID id) {
        return getOnboarding.byId(OnboardingId.of(id), UserId.of(userId));
    }

    @PostMapping("/{id}/otp")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void requestOtp(
            @RequestHeader(UserHeader.NAME) UUID userId, @PathVariable UUID id, @RequestBody RequestOtpRequest request) {
        requestOtp.execute(OnboardingId.of(id), UserId.of(userId), request.phoneNumber());
    }

    @PostMapping("/{id}/steps/{stepCode}")
    public OnboardingView submitStep(
            @RequestHeader(UserHeader.NAME) UUID userId,
            @PathVariable UUID id,
            @PathVariable String stepCode,
            @RequestBody SubmitStepRequest request) {
        return submitStep.execute(
                new SubmitStepCommand(OnboardingId.of(id), UserId.of(userId), stepCode, request.values()));
    }
}

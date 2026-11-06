package com.wallet.onboarding.adapters.in.web;

import java.util.Map;

public final class OnboardingRequests {

    private OnboardingRequests() {
    }

    public record SubmitStepRequest(Map<String, String> values) {
    }

    public record RequestOtpRequest(String phoneNumber) {
    }
}

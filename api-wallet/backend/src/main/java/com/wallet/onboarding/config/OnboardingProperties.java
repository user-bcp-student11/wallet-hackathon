package com.wallet.onboarding.config;

import com.wallet.onboarding.domain.StepType;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties("onboarding")
public record OnboardingProperties(
        List<Step> steps,
        @DefaultValue("24") int abandonHours,
        @DefaultValue("PT5M") Duration abandonCheckInterval,
        @DefaultValue Otp otp) {

    public record Step(StepType type, String title, String instruction) {
    }

    public record Otp(@DefaultValue("123456") String fakeCode) {
    }
}

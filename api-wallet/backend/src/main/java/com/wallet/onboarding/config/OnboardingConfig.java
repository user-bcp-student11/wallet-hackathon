package com.wallet.onboarding.config;

import com.wallet.onboarding.application.AbandonPolicy;
import com.wallet.onboarding.domain.StepDefinition;
import com.wallet.onboarding.domain.StepSequence;
import java.time.Duration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
@EnableConfigurationProperties(OnboardingProperties.class)
public class OnboardingConfig {

    @Bean
    StepSequence stepSequence(OnboardingProperties properties) {
        return new StepSequence(properties.steps().stream()
                .map(step -> new StepDefinition(step.type(), step.title(), step.instruction()))
                .toList());
    }

    @Bean
    AbandonPolicy abandonPolicy(OnboardingProperties properties) {
        return new AbandonPolicy(Duration.ofHours(properties.abandonHours()));
    }
}

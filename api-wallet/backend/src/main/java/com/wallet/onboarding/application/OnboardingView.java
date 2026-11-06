package com.wallet.onboarding.application;

import com.wallet.onboarding.domain.Onboarding;
import com.wallet.onboarding.domain.OnboardingStatus;
import com.wallet.onboarding.domain.StepDefinition;
import com.wallet.onboarding.domain.StepSequence;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public record OnboardingView(
        UUID id,
        OnboardingStatus status,
        int stepNumber,
        int totalSteps,
        String currentStep,
        String instruction,
        String nextStepLabel,
        List<StepView> steps,
        boolean walletActive) {

    public enum StepStatus { COMPLETED, CURRENT, PENDING }

    public record StepView(String code, String title, StepStatus status) {
    }

    public static OnboardingView of(Onboarding onboarding, StepSequence sequence) {
        Optional<StepDefinition> current = onboarding.currentStep(sequence);
        boolean completed = onboarding.status() == OnboardingStatus.COMPLETED;
        return new OnboardingView(
                onboarding.id().value(),
                onboarding.status(),
                current.map(step -> sequence.indexOf(step.type()) + 1).orElse(sequence.size()),
                sequence.size(),
                current.map(StepDefinition::code).orElse(null),
                current.map(StepDefinition::instruction).orElse(null),
                current.flatMap(step -> sequence.nextAfter(step.type())).map(StepDefinition::title).orElse(null),
                sequence.steps().stream().map(step -> stepView(onboarding, step, current)).toList(),
                completed);
    }

    private static StepView stepView(Onboarding onboarding, StepDefinition step, Optional<StepDefinition> current) {
        StepStatus status = onboarding.completedSteps().contains(step.type())
                ? StepStatus.COMPLETED
                : current.filter(c -> c.type() == step.type()).isPresent() ? StepStatus.CURRENT : StepStatus.PENDING;
        return new StepView(step.code(), step.title(), status);
    }
}

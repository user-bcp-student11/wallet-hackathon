package com.wallet.onboarding.domain;

import com.wallet.shared.domain.UserId;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Optional;
import java.util.Set;

public record Onboarding(
        OnboardingId id,
        UserId userId,
        OnboardingStatus status,
        Set<StepType> completedSteps,
        Instant lastActivityAt,
        long version) {

    public Onboarding {
        completedSteps = Set.copyOf(completedSteps);
    }

    public static Onboarding start(OnboardingId id, UserId userId, Instant now) {
        return new Onboarding(id, userId, OnboardingStatus.IN_PROGRESS, Set.of(), now, 0);
    }

    public Optional<StepDefinition> currentStep(StepSequence sequence) {
        return sequence.firstNotIn(completedSteps);
    }

    public boolean isFinalConfirmationRepeat(String stepCode, StepSequence sequence) {
        return status == OnboardingStatus.COMPLETED && sequence.last().code().equals(stepCode);
    }

    public StepDefinition requireCurrentStep(String stepCode, StepSequence sequence) {
        requireInProgress();
        StepDefinition current = currentStep(sequence).orElseThrow();
        if (!current.code().equals(stepCode)) {
            throw new StepOutOfOrderException(current.type());
        }
        return current;
    }

    public Onboarding completeStep(String stepCode, StepSequence sequence, Instant now) {
        StepDefinition current = requireCurrentStep(stepCode, sequence);
        Set<StepType> completed = EnumSet.noneOf(StepType.class);
        completed.addAll(completedSteps);
        completed.add(current.type());
        OnboardingStatus nextStatus = sequence.isCompletedBy(completed)
                ? OnboardingStatus.COMPLETED
                : OnboardingStatus.IN_PROGRESS;
        return new Onboarding(id, userId, nextStatus, completed, now, version);
    }

    public void requireInProgress() {
        if (status != OnboardingStatus.IN_PROGRESS) {
            throw new OnboardingNotInProgressException(status);
        }
    }
}

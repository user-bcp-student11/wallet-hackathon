package com.wallet.onboarding.application;

import com.wallet.onboarding.application.port.out.OnboardingRepositoryPort;
import com.wallet.onboarding.application.port.out.WalletActivationPort;
import com.wallet.onboarding.application.step.StepHandler;
import com.wallet.onboarding.application.step.StepValues;
import com.wallet.onboarding.domain.FieldError;
import com.wallet.onboarding.domain.Onboarding;
import com.wallet.onboarding.domain.OnboardingId;
import com.wallet.onboarding.domain.OnboardingNotFoundException;
import com.wallet.onboarding.domain.OnboardingStatus;
import com.wallet.onboarding.domain.StepDefinition;
import com.wallet.onboarding.domain.StepSequence;
import com.wallet.onboarding.domain.StepType;
import com.wallet.onboarding.domain.ValidationFailedException;
import com.wallet.shared.domain.UserId;
import java.time.Clock;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubmitStepUseCase {

    private static final Logger log = LoggerFactory.getLogger(SubmitStepUseCase.class);

    private final OnboardingRepositoryPort repository;
    private final WalletActivationPort walletActivation;
    private final StepSequence sequence;
    private final Map<StepType, StepHandler> handlers = new EnumMap<>(StepType.class);
    private final Clock clock;

    public SubmitStepUseCase(
            OnboardingRepositoryPort repository,
            WalletActivationPort walletActivation,
            StepSequence sequence,
            List<StepHandler> stepHandlers,
            Clock clock) {
        this.repository = repository;
        this.walletActivation = walletActivation;
        this.sequence = sequence;
        this.clock = clock;
        stepHandlers.forEach(handler -> handlers.put(handler.type(), handler));
    }

    @Transactional
    public OnboardingView execute(SubmitStepCommand command) {
        Onboarding onboarding = repository.findByIdAndUser(command.onboardingId(), command.userId())
                .orElseThrow(OnboardingNotFoundException::new);
        if (onboarding.isFinalConfirmationRepeat(command.stepCode(), sequence)) {
            return OnboardingView.of(onboarding, sequence);
        }
        StepDefinition step = onboarding.requireCurrentStep(command.stepCode(), sequence);
        List<FieldError> errors = handlers.get(step.type()).validate(new StepValues(command.values()));
        if (!errors.isEmpty()) {
            log.info("onboarding_step_rejected onboardingId={} step={} fields={}",
                    command.onboardingId().value(), step.code(), errors.stream().map(FieldError::field).toList());
            throw new ValidationFailedException(errors);
        }
        Onboarding updated = onboarding.completeStep(command.stepCode(), sequence, clock.instant());
        repository.update(updated);
        if (updated.status() == OnboardingStatus.COMPLETED) {
            walletActivation.activate(command.userId());
        }
        log.info("onboarding_step_completed onboardingId={} step={} status={}",
                command.onboardingId().value(), step.code(), updated.status());
        return OnboardingView.of(updated, sequence);
    }

    public record SubmitStepCommand(
            OnboardingId onboardingId, UserId userId, String stepCode, Map<String, String> values) {
    }
}

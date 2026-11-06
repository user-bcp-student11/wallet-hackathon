package com.wallet.onboarding.application.step;

import com.wallet.onboarding.domain.FieldError;
import com.wallet.onboarding.domain.StepType;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class ConfirmationStepHandler implements StepHandler {

    @Override
    public StepType type() {
        return StepType.CONFIRMATION;
    }

    @Override
    public List<FieldError> validate(StepValues values) {
        if ("true".equals(values.get("acceptedTerms"))) {
            return List.of();
        }
        return List.of(new FieldError("acceptedTerms", "Acepta los términos y condiciones para continuar."));
    }
}

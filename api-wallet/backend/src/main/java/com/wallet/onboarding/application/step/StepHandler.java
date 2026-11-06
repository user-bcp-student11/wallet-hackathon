package com.wallet.onboarding.application.step;

import com.wallet.onboarding.domain.FieldError;
import com.wallet.onboarding.domain.StepType;
import java.util.List;

public interface StepHandler {

    StepType type();

    List<FieldError> validate(StepValues values);
}

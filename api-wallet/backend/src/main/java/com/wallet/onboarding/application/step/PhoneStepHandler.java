package com.wallet.onboarding.application.step;

import com.wallet.onboarding.application.port.out.OtpProviderPort;
import com.wallet.onboarding.domain.FieldError;
import com.wallet.onboarding.domain.PeruRules;
import com.wallet.onboarding.domain.StepType;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class PhoneStepHandler implements StepHandler {

    static final String PHONE_FIELD = "phoneNumber";
    static final String OTP_FIELD = "otpCode";

    private final OtpProviderPort otpProvider;

    public PhoneStepHandler(OtpProviderPort otpProvider) {
        this.otpProvider = otpProvider;
    }

    @Override
    public StepType type() {
        return StepType.PHONE;
    }

    @Override
    public List<FieldError> validate(StepValues values) {
        String phone = values.get(PHONE_FIELD);
        String code = values.get(OTP_FIELD);
        List<FieldError> errors = new ArrayList<>();
        PeruRules.phone(phone).ifPresent(message -> errors.add(new FieldError(PHONE_FIELD, message)));
        if (code.isEmpty()) {
            errors.add(new FieldError(OTP_FIELD, "Ingresa el código que enviamos a tu celular."));
        }
        if (errors.isEmpty() && !otpProvider.verify(phone, code)) {
            errors.add(new FieldError(OTP_FIELD, "El código es incorrecto. Revísalo e inténtalo de nuevo."));
        }
        return errors;
    }
}

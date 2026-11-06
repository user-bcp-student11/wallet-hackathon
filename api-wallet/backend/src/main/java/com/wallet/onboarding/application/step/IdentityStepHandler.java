package com.wallet.onboarding.application.step;

import com.wallet.onboarding.application.port.out.IdentityValidationPort;
import com.wallet.onboarding.application.port.out.IdentityValidationPort.IdentityData;
import com.wallet.onboarding.domain.DocumentType;
import com.wallet.onboarding.domain.FieldError;
import com.wallet.onboarding.domain.PeruRules;
import com.wallet.onboarding.domain.StepType;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class IdentityStepHandler implements StepHandler {

    private final IdentityValidationPort identityValidation;
    private final Clock clock;

    public IdentityStepHandler(IdentityValidationPort identityValidation, Clock clock) {
        this.identityValidation = identityValidation;
        this.clock = clock;
    }

    @Override
    public StepType type() {
        return StepType.IDENTITY;
    }

    @Override
    public List<FieldError> validate(StepValues values) {
        List<FieldError> errors = new ArrayList<>();
        Optional<DocumentType> documentType = DocumentType.parse(values.get("documentType"));
        if (documentType.isEmpty()) {
            errors.add(new FieldError("documentType", "Elige el tipo de documento: DNI o CE."));
        }
        documentType.flatMap(type -> type.validateNumber(values.get("documentNumber")))
                .ifPresent(message -> errors.add(new FieldError("documentNumber", message)));
        PeruRules.requiredName(values.get("firstName"), "Ingresa tus nombres.")
                .ifPresent(message -> errors.add(new FieldError("firstName", message)));
        PeruRules.requiredName(values.get("lastName"), "Ingresa tus apellidos.")
                .ifPresent(message -> errors.add(new FieldError("lastName", message)));
        LocalDate today = LocalDate.now(clock);
        PeruRules.adult(values.get("birthDate"), today)
                .ifPresent(message -> errors.add(new FieldError("birthDate", message)));
        if (errors.isEmpty() && !isIdentityValid(values, documentType.orElseThrow())) {
            errors.add(new FieldError("documentNumber",
                    "No pudimos validar tu documento. Revisa los datos e inténtalo de nuevo."));
        }
        return errors;
    }

    private boolean isIdentityValid(StepValues values, DocumentType documentType) {
        return identityValidation.isValid(new IdentityData(
                documentType,
                values.get("documentNumber"),
                values.get("firstName"),
                values.get("lastName"),
                LocalDate.parse(values.get("birthDate"))));
    }
}

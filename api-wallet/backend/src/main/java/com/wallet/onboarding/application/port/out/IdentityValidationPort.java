package com.wallet.onboarding.application.port.out;

import com.wallet.onboarding.domain.DocumentType;
import java.time.LocalDate;

public interface IdentityValidationPort {

    boolean isValid(IdentityData identity);

    record IdentityData(
            DocumentType documentType,
            String documentNumber,
            String firstName,
            String lastName,
            LocalDate birthDate) {
    }
}

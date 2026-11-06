package com.wallet.onboarding.adapters.out.provider;

import com.wallet.onboarding.application.port.out.IdentityValidationPort;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** Proveedor simulado: da por válida cualquier identidad con formato correcto. */
@Component
@Profile("!prod")
public class FakeIdentityValidation implements IdentityValidationPort {

    @Override
    public boolean isValid(IdentityData identity) {
        return true;
    }
}

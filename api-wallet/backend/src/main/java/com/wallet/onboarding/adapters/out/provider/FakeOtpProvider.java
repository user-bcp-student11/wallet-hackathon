package com.wallet.onboarding.adapters.out.provider;

import com.wallet.onboarding.application.port.out.OtpProviderPort;
import com.wallet.onboarding.config.OnboardingProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** Proveedor simulado: acepta un código fijo. No se registra en el perfil prod, por lo que la aplicación no arranca allí con el fake. */
@Component
@Profile("!prod")
public class FakeOtpProvider implements OtpProviderPort {

    private static final Logger log = LoggerFactory.getLogger(FakeOtpProvider.class);

    private final String fixedCode;

    public FakeOtpProvider(OnboardingProperties properties) {
        this.fixedCode = properties.otp().fakeCode();
    }

    @Override
    public void sendCode(String phoneNumber) {
        log.info("otp_requested provider=fake");
    }

    @Override
    public boolean verify(String phoneNumber, String code) {
        return fixedCode.equals(code);
    }
}

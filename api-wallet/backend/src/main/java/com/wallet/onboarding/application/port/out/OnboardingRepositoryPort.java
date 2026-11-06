package com.wallet.onboarding.application.port.out;

import com.wallet.onboarding.domain.Onboarding;
import com.wallet.onboarding.domain.OnboardingId;
import com.wallet.shared.domain.UserId;
import java.time.Instant;
import java.util.Optional;

public interface OnboardingRepositoryPort {

    Optional<Onboarding> findByIdAndUser(OnboardingId id, UserId userId);

    Optional<Onboarding> findInProgressByUser(UserId userId);

    /** @throws com.wallet.onboarding.domain.OnboardingAlreadyInProgressException si el usuario ya tiene uno en curso */
    void insert(Onboarding onboarding);

    /** Persiste el avance solo si la versión y el estado EN CURSO siguen vigentes.
     * @throws com.wallet.onboarding.domain.OnboardingConflictException si otra operación lo modificó */
    void update(Onboarding onboarding);

    int abandonInProgressInactiveBefore(Instant cutoff);
}

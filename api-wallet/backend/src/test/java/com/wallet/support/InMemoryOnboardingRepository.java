package com.wallet.support;

import com.wallet.onboarding.application.port.out.OnboardingRepositoryPort;
import com.wallet.onboarding.domain.Onboarding;
import com.wallet.onboarding.domain.OnboardingAlreadyInProgressException;
import com.wallet.onboarding.domain.OnboardingConflictException;
import com.wallet.onboarding.domain.OnboardingId;
import com.wallet.onboarding.domain.OnboardingStatus;
import com.wallet.shared.domain.UserId;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public class InMemoryOnboardingRepository implements OnboardingRepositoryPort {

    private final Map<OnboardingId, Onboarding> store = new HashMap<>();

    @Override
    public Optional<Onboarding> findByIdAndUser(OnboardingId id, UserId userId) {
        return Optional.ofNullable(store.get(id)).filter(o -> o.userId().equals(userId));
    }

    @Override
    public Optional<Onboarding> findInProgressByUser(UserId userId) {
        return store.values().stream()
                .filter(o -> o.userId().equals(userId) && o.status() == OnboardingStatus.IN_PROGRESS)
                .findFirst();
    }

    @Override
    public void insert(Onboarding onboarding) {
        if (findInProgressByUser(onboarding.userId()).isPresent()) {
            throw new OnboardingAlreadyInProgressException();
        }
        store.put(onboarding.id(), onboarding);
    }

    @Override
    public void update(Onboarding onboarding) {
        Onboarding current = store.get(onboarding.id());
        if (current == null || current.status() != OnboardingStatus.IN_PROGRESS
                || current.version() != onboarding.version()) {
            throw new OnboardingConflictException();
        }
        store.put(onboarding.id(), new Onboarding(onboarding.id(), onboarding.userId(), onboarding.status(),
                onboarding.completedSteps(), onboarding.lastActivityAt(), onboarding.version() + 1));
    }

    @Override
    public int abandonInProgressInactiveBefore(Instant cutoff) {
        int abandoned = 0;
        for (Onboarding o : Map.copyOf(store).values()) {
            if (o.status() == OnboardingStatus.IN_PROGRESS && o.lastActivityAt().isBefore(cutoff)) {
                store.put(o.id(), new Onboarding(o.id(), o.userId(), OnboardingStatus.ABANDONED,
                        o.completedSteps(), o.lastActivityAt(), o.version() + 1));
                abandoned++;
            }
        }
        return abandoned;
    }

    public Onboarding get(OnboardingId id) {
        return store.get(id);
    }
}

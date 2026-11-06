package com.wallet.onboarding.adapters;

import static org.assertj.core.api.Assertions.assertThat;

import com.wallet.onboarding.adapters.out.persistence.JdbcOnboardingRepository;
import com.wallet.onboarding.domain.Onboarding;
import com.wallet.onboarding.domain.OnboardingAlreadyInProgressException;
import com.wallet.onboarding.domain.OnboardingConflictException;
import com.wallet.onboarding.domain.OnboardingId;
import com.wallet.onboarding.domain.OnboardingStatus;
import com.wallet.onboarding.domain.StepSequence;
import com.wallet.shared.domain.UserId;
import com.wallet.support.Fixtures;
import com.wallet.support.IntegrationTest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class JdbcOnboardingRepositoryIT extends IntegrationTest {

    private static final Instant NOW = Instant.parse("2026-11-06T10:00:00Z");
    private static final StepSequence SEQUENCE = Fixtures.DEFAULT_SEQUENCE;

    @Autowired
    private JdbcOnboardingRepository repository;

    @Test
    @DisplayName("Scenario: Un único onboarding en curso por usuario (concurrente)")
    void onlyOneConcurrentInsertForTheSameUserSucceeds() throws Exception {
        UserId user = UserId.of(UUID.randomUUID());

        List<Boolean> results = runConcurrently(8, () -> {
            try {
                repository.insert(Onboarding.start(OnboardingId.newId(), user, NOW));
                return true;
            } catch (OnboardingAlreadyInProgressException e) {
                return false;
            }
        });

        assertThat(results).filteredOn(Boolean::booleanValue).hasSize(1);
        assertThat(jdbc.sql("SELECT count(*) FROM onboardings").query(Long.class).single()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Scenario: Transición condicional (concurrente)")
    void onlyOneConcurrentAdvanceOfTheSameVersionSucceeds() throws Exception {
        Onboarding onboarding = Onboarding.start(OnboardingId.newId(), UserId.of(UUID.randomUUID()), NOW);
        repository.insert(onboarding);
        Onboarding advanced = onboarding.completeStep("phone", SEQUENCE, NOW.plusSeconds(5));

        List<Boolean> results = runConcurrently(8, () -> {
            try {
                repository.update(advanced);
                return true;
            } catch (OnboardingConflictException e) {
                return false;
            }
        });

        assertThat(results).filteredOn(Boolean::booleanValue).hasSize(1);
        Onboarding stored = repository.findByIdAndUser(onboarding.id(), onboarding.userId()).orElseThrow();
        assertThat(stored.version()).isEqualTo(1);
        assertThat(stored.completedSteps()).hasSize(1);
        assertThat(stored.lastActivityAt()).isEqualTo(NOW.plusSeconds(5));
    }

    @Test
    @DisplayName("Scenario: Abandono solo de los inactivos")
    void abandonOnlyAffectsInProgressOnboardingsInactiveBeforeTheCutoff() {
        Onboarding stale = Onboarding.start(OnboardingId.newId(), UserId.of(UUID.randomUUID()), NOW.minusSeconds(100));
        Onboarding recent = Onboarding.start(OnboardingId.newId(), UserId.of(UUID.randomUUID()), NOW);
        repository.insert(stale);
        repository.insert(recent);

        int abandoned = repository.abandonInProgressInactiveBefore(NOW.minusSeconds(50));

        assertThat(abandoned).isEqualTo(1);
        assertThat(repository.findByIdAndUser(stale.id(), stale.userId()).orElseThrow().status())
                .isEqualTo(OnboardingStatus.ABANDONED);
        assertThat(repository.findByIdAndUser(recent.id(), recent.userId()).orElseThrow().status())
                .isEqualTo(OnboardingStatus.IN_PROGRESS);
    }

    @Test
    @DisplayName("Scenario: Un abandonado libera al usuario para iniciar otro")
    void abandonedOnboardingDoesNotBlockANewOne() {
        UserId user = UserId.of(UUID.randomUUID());
        repository.insert(Onboarding.start(OnboardingId.newId(), user, NOW.minusSeconds(100)));
        repository.abandonInProgressInactiveBefore(NOW);

        repository.insert(Onboarding.start(OnboardingId.newId(), user, NOW));

        assertThat(repository.findInProgressByUser(user)).isPresent();
    }

    private static <T> List<T> runConcurrently(int threads, Callable<T> task) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch go = new CountDownLatch(1);
        try {
            List<Future<T>> futures = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    go.await();
                    return task.call();
                }));
            }
            ready.await();
            go.countDown();
            List<T> results = new ArrayList<>();
            for (Future<T> future : futures) {
                results.add(future.get());
            }
            return results;
        } finally {
            executor.shutdownNow();
        }
    }
}

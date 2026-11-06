package com.wallet.onboarding.adapters;

import static org.assertj.core.api.Assertions.assertThat;

import com.wallet.onboarding.application.CreateKycVerificationUseCase;
import com.wallet.onboarding.application.CreateKycVerificationUseCase.CreateKycCommand;
import com.wallet.onboarding.application.DecideKycVerificationUseCase;
import com.wallet.onboarding.application.GetKycVerificationUseCase;
import com.wallet.onboarding.domain.DecisionConflictException;
import com.wallet.onboarding.domain.KycId;
import com.wallet.onboarding.domain.KycVerification;
import com.wallet.support.IntegrationTest;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class KycDecisionConcurrencyIT extends IntegrationTest {

    private static final int ATTEMPTS = 8;

    @Autowired
    private CreateKycVerificationUseCase create;

    @Autowired
    private DecideKycVerificationUseCase decide;

    @Autowired
    private GetKycVerificationUseCase get;

    @Test
    @DisplayName("Scenario: Decisiones contrarias simultáneas dejan un único resultado final")
    void oppositeConcurrentDecisionsLeaveASingleFinalResult() throws Exception {
        KycVerification pending = create.execute(new CreateKycCommand("TEST", "TEST-001", "MANUAL_REVIEW"));

        List<Outcome> outcomes = decideConcurrently(pending.id());

        String finalStatus = get.execute(pending.id()).status().name();
        assertThat(outcomes).allSatisfy(outcome -> assertThat(outcome.succeeded())
                .as("decisión %s con resultado final %s", outcome.decision(), finalStatus)
                .isEqualTo(outcome.decision().equals(finalStatus)));
        assertThat(walletStatus(pending)).isEqualTo(finalStatus);
        assertThat(supportCaseStatus(pending)).isEqualTo("RESOLVED");
    }

    private List<Outcome> decideConcurrently(KycId id) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(ATTEMPTS);
        CountDownLatch ready = new CountDownLatch(ATTEMPTS);
        CountDownLatch go = new CountDownLatch(1);
        try {
            List<Future<Outcome>> futures = new ArrayList<>();
            for (int i = 0; i < ATTEMPTS; i++) {
                String decision = i % 2 == 0 ? "ACTIVE" : "REJECTED";
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    go.await();
                    return attempt(id, decision);
                }));
            }
            ready.await();
            go.countDown();
            List<Outcome> outcomes = new ArrayList<>();
            for (Future<Outcome> future : futures) {
                outcomes.add(future.get());
            }
            return outcomes;
        } finally {
            executor.shutdownNow();
        }
    }

    private Outcome attempt(KycId id, String decision) {
        try {
            decide.execute(id, decision);
            return new Outcome(decision, true);
        } catch (DecisionConflictException e) {
            return new Outcome(decision, false);
        }
    }

    private String walletStatus(KycVerification verification) {
        return jdbc.sql("SELECT status FROM wallets WHERE id = :id")
                .param("id", verification.walletId().value()).query(String.class).single();
    }

    private String supportCaseStatus(KycVerification verification) {
        return jdbc.sql("SELECT status FROM support_cases WHERE resource = :id")
                .param("id", verification.id().value()).query(String.class).single();
    }

    private record Outcome(String decision, boolean succeeded) {
    }
}

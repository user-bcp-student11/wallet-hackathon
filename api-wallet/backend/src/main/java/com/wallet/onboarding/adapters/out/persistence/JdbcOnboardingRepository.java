package com.wallet.onboarding.adapters.out.persistence;

import com.wallet.onboarding.application.port.out.OnboardingRepositoryPort;
import com.wallet.onboarding.domain.Onboarding;
import com.wallet.onboarding.domain.OnboardingAlreadyInProgressException;
import com.wallet.onboarding.domain.OnboardingConflictException;
import com.wallet.onboarding.domain.OnboardingId;
import com.wallet.onboarding.domain.OnboardingStatus;
import com.wallet.onboarding.domain.StepType;
import com.wallet.shared.domain.UserId;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class JdbcOnboardingRepository implements OnboardingRepositoryPort {

    private static final String SELECT_ONBOARDING =
            "SELECT id, user_id, status, last_activity_at, version FROM onboardings ";

    private final JdbcClient jdbc;

    public JdbcOnboardingRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<Onboarding> findByIdAndUser(OnboardingId id, UserId userId) {
        return jdbc.sql(SELECT_ONBOARDING + "WHERE id = :id AND user_id = :userId")
                .param("id", id.value())
                .param("userId", userId.value())
                .query(this::mapOnboarding)
                .optional();
    }

    @Override
    public Optional<Onboarding> findInProgressByUser(UserId userId) {
        return jdbc.sql(SELECT_ONBOARDING + "WHERE user_id = :userId AND status = 'IN_PROGRESS'")
                .param("userId", userId.value())
                .query(this::mapOnboarding)
                .optional();
    }

    @Override
    public void insert(Onboarding onboarding) {
        int inserted = jdbc.sql("""
                        INSERT INTO onboardings (id, user_id, status, last_activity_at, created_at, version)
                        VALUES (:id, :userId, :status, :at, :at, :version)
                        ON CONFLICT (user_id) WHERE status = 'IN_PROGRESS' DO NOTHING
                        """)
                .param("id", onboarding.id().value())
                .param("userId", onboarding.userId().value())
                .param("status", onboarding.status().name())
                .param("at", utc(onboarding.lastActivityAt()))
                .param("version", onboarding.version())
                .update();
        if (inserted == 0) {
            throw new OnboardingAlreadyInProgressException();
        }
    }

    @Override
    @Transactional
    public void update(Onboarding onboarding) {
        int updated = jdbc.sql("""
                        UPDATE onboardings
                           SET status = :status, last_activity_at = :at, version = version + 1
                         WHERE id = :id AND version = :version AND status = 'IN_PROGRESS'
                        """)
                .param("status", onboarding.status().name())
                .param("at", utc(onboarding.lastActivityAt()))
                .param("id", onboarding.id().value())
                .param("version", onboarding.version())
                .update();
        if (updated == 0) {
            throw new OnboardingConflictException();
        }
        onboarding.completedSteps().forEach(step -> insertCompletedStep(onboarding, step));
    }

    @Override
    public int abandonInProgressInactiveBefore(Instant cutoff) {
        return jdbc.sql("""
                        UPDATE onboardings SET status = 'ABANDONED', version = version + 1
                         WHERE status = 'IN_PROGRESS' AND last_activity_at < :cutoff
                        """)
                .param("cutoff", utc(cutoff))
                .update();
    }

    private void insertCompletedStep(Onboarding onboarding, StepType step) {
        jdbc.sql("""
                        INSERT INTO onboarding_steps (onboarding_id, step_code, completed_at)
                        VALUES (:id, :code, :at)
                        ON CONFLICT (onboarding_id, step_code) DO NOTHING
                        """)
                .param("id", onboarding.id().value())
                .param("code", step.code())
                .param("at", utc(onboarding.lastActivityAt()))
                .update();
    }

    private Onboarding mapOnboarding(ResultSet rs, int rowNum) throws SQLException {
        UUID id = rs.getObject("id", UUID.class);
        return new Onboarding(
                OnboardingId.of(id),
                UserId.of(rs.getObject("user_id", UUID.class)),
                OnboardingStatus.valueOf(rs.getString("status")),
                completedSteps(id),
                rs.getObject("last_activity_at", OffsetDateTime.class).toInstant(),
                rs.getLong("version"));
    }

    private Set<StepType> completedSteps(UUID onboardingId) {
        Set<StepType> steps = EnumSet.noneOf(StepType.class);
        jdbc.sql("SELECT step_code FROM onboarding_steps WHERE onboarding_id = :id")
                .param("id", onboardingId)
                .query(String.class)
                .list()
                .forEach(code -> steps.add(StepType.fromCode(code).orElseThrow()));
        return steps;
    }

    private static OffsetDateTime utc(Instant instant) {
        return OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
    }
}

CREATE TABLE onboardings (
    id               UUID        PRIMARY KEY,
    user_id          UUID        NOT NULL,
    status           VARCHAR(20) NOT NULL CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
    last_activity_at TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL,
    version          BIGINT      NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX uq_onboardings_user_in_progress ON onboardings (user_id) WHERE status = 'IN_PROGRESS';
CREATE INDEX ix_onboardings_in_progress_activity ON onboardings (last_activity_at) WHERE status = 'IN_PROGRESS';

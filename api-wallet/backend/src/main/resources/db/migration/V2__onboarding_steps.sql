CREATE TABLE onboarding_steps (
    onboarding_id UUID        NOT NULL REFERENCES onboardings (id),
    step_code     VARCHAR(30) NOT NULL,
    completed_at  TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (onboarding_id, step_code)
);

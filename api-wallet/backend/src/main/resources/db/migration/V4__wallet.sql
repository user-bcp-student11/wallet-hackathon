CREATE TABLE wallets (
    user_id      UUID        PRIMARY KEY,
    status       VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE')),
    activated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE idempotency_records (
    scope           VARCHAR(200) NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    status_code     INT          NOT NULL,
    response_body   TEXT         NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL,
    PRIMARY KEY (scope, idempotency_key)
);

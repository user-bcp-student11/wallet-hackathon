CREATE TABLE kyc_verifications (
    id        VARCHAR(100) PRIMARY KEY,
    wallet_id VARCHAR(100) NOT NULL REFERENCES wallets (id),
    scenario  VARCHAR(20)  NOT NULL CHECK (scenario IN ('APPROVED', 'REJECTED', 'MANUAL_REVIEW')),
    status    VARCHAR(20)  NOT NULL CHECK (status IN ('ACTIVE', 'PENDING', 'REJECTED'))
);

CREATE TABLE support_cases (
    id       VARCHAR(100) PRIMARY KEY,
    resource VARCHAR(100) NOT NULL,
    reason   VARCHAR(30)  NOT NULL CHECK (reason IN ('KYC_REVIEW')),
    status   VARCHAR(20)  NOT NULL CHECK (status IN ('OPEN', 'RESOLVED'))
);

CREATE INDEX ix_support_cases_resource ON support_cases (resource);

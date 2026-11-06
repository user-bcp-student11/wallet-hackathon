CREATE TABLE wallets (
    id       VARCHAR(100) PRIMARY KEY,
    status   VARCHAR(20)  NOT NULL CHECK (status IN ('ACTIVE', 'PENDING', 'REJECTED')),
    balance  BIGINT       NOT NULL DEFAULT 0 CHECK (balance >= 0),
    reserved BIGINT       NOT NULL DEFAULT 0 CHECK (reserved >= 0)
);

INSERT INTO wallets (id, status, balance, reserved) VALUES ('wallet-demo', 'ACTIVE', 100000, 0);

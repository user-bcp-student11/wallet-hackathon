package com.wallet.onboarding.application.port.out;

import java.util.Optional;

public interface IdempotencyStorePort {

    Optional<StoredResponse> find(String scope, String key);

    void save(String scope, String key, StoredResponse response);

    record StoredResponse(int status, String body) {
    }
}

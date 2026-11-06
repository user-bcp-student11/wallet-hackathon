package com.wallet.onboarding.domain;

import com.wallet.shared.domain.WalletId;

public record KycVerification(KycId id, WalletId walletId, KycScenario scenario, KycStatus status) {

    public static KycVerification register(KycScenario scenario, WalletId walletId, KycStatus status) {
        return new KycVerification(KycId.newId(), walletId, scenario, status);
    }

    /**
     * Aplica la decisión del operador. Repetir la decisión ya tomada no cambia nada; contradecir una decisión final
     * es un conflicto.
     */
    public KycVerification decide(KycDecision decision) {
        if (status == KycStatus.PENDING) {
            return new KycVerification(id, walletId, scenario, decision.finalStatus());
        }
        if (status == decision.finalStatus()) {
            return this;
        }
        throw new DecisionConflictException();
    }
}

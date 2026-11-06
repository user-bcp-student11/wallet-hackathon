package com.wallet.onboarding.adapters.in.web;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.wallet.onboarding.application.CreateKycVerificationUseCase;
import com.wallet.onboarding.application.CreateKycVerificationUseCase.CreateKycCommand;
import com.wallet.onboarding.application.DecideKycVerificationUseCase;
import com.wallet.onboarding.application.GetKycVerificationUseCase;
import com.wallet.onboarding.domain.KycId;
import com.wallet.onboarding.domain.KycVerification;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/kyc/verifications")
public class KycController {

    private final CreateKycVerificationUseCase createVerification;
    private final GetKycVerificationUseCase getVerification;
    private final DecideKycVerificationUseCase decideVerification;

    public KycController(
            CreateKycVerificationUseCase createVerification,
            GetKycVerificationUseCase getVerification,
            DecideKycVerificationUseCase decideVerification) {
        this.createVerification = createVerification;
        this.getVerification = getVerification;
        this.decideVerification = decideVerification;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public KycResponse create(@RequestBody CreateKycRequest request) {
        return KycResponse.from(createVerification.execute(
                new CreateKycCommand(request.documentType(), request.document(), request.scenario())));
    }

    @GetMapping("/{id}")
    public KycResponse get(@PathVariable String id) {
        return KycResponse.from(getVerification.execute(KycId.of(id)));
    }

    @PostMapping("/{id}/decision")
    public KycResponse decide(@PathVariable String id, @RequestBody DecisionRequest request) {
        return KycResponse.from(decideVerification.execute(KycId.of(id), request.decision()));
    }

    public record CreateKycRequest(String documentType, String document, String scenario) {
    }

    public record DecisionRequest(String decision) {
    }

    public record KycResponse(String id, @JsonProperty("wallet_id") String walletId, String scenario, String status) {

        static KycResponse from(KycVerification verification) {
            return new KycResponse(verification.id().value(), verification.walletId().value(),
                    verification.scenario().name(), verification.status().name());
        }
    }
}

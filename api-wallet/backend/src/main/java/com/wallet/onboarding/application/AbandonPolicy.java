package com.wallet.onboarding.application;

import java.time.Duration;

public record AbandonPolicy(Duration inactivityLimit) {
}

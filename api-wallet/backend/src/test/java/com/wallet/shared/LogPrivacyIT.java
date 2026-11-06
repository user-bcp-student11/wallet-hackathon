package com.wallet.shared;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.wallet.support.ApiTest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class LogPrivacyIT extends ApiTest {

    private static final List<String> PERSONAL_VALUES = List.of(
            "7654321", "Zulema", "Quispe-Test", "1990-05-20", "812345678", "912345678", "654987", "123456");

    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();
    private Logger rootLogger;

    @BeforeEach
    void attachAppender() {
        rootLogger = (Logger) LoggerFactory.getLogger(Logger.ROOT_LOGGER_NAME);
        appender.start();
        rootLogger.addAppender(appender);
    }

    @AfterEach
    void detachAppender() {
        rootLogger.detachAppender(appender);
    }

    @Test
    @DisplayName("Scenario: Registro de errores de validación")
    void rejectedValuesNeverAppearInLogs() throws Exception {
        UUID id = startedOnboardingId();
        submitStep(id, "phone", Map.of("phoneNumber", "812345678", "otpCode", "654987"));
        submitStep(id, "phone", Map.of("phoneNumber", "912345678", "otpCode", "654987"));
        submitStep(id, "phone", com.wallet.support.Fixtures.validPhoneStep());
        Map<String, String> identity = new HashMap<>();
        identity.put("documentType", "DNI");
        identity.put("documentNumber", "7654321");
        identity.put("firstName", "");
        identity.put("lastName", "Quispe-Test");
        identity.put("birthDate", "1990-05-20x");
        submitStep(id, "identity", identity);
        identity.put("firstName", "Zulema");
        identity.put("birthDate", "2020-05-20");
        submitStep(id, "identity", identity);

        List<String> logs = appender.list.stream().map(ILoggingEvent::getFormattedMessage).toList();

        assertThat(logs).isNotEmpty();
        assertThat(logs).noneSatisfy(message -> assertThat(PERSONAL_VALUES.stream().anyMatch(message::contains))
                .as("El registro contiene un dato personal: %s", message).isTrue());
    }
}

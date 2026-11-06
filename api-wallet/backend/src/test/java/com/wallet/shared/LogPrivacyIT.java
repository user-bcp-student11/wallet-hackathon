package com.wallet.shared;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.JsonNode;
import com.wallet.support.ApiTest;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class LogPrivacyIT extends ApiTest {

    private static final String DOCUMENT = "TEST-PRIVACIDAD-98765";

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
    @DisplayName("Scenario: El documento enviado nunca aparece en los registros")
    void submittedDocumentNeverAppearsInLogs() throws Exception {
        JsonNode review = body(postKyc("{\"documentType\":\"TEST\",\"document\":\"" + DOCUMENT + "\",\"scenario\":\"MANUAL_REVIEW\"}"));
        postKyc("{\"documentType\":\"TEST\",\"document\":\"" + DOCUMENT + "\",\"scenario\":\"UNAVAILABLE\"}");
        postKyc("{\"documentType\":\"DNI\",\"document\":\"" + DOCUMENT + "\"}");
        decide(review.get("id").asText(), "ACTIVE", true);

        List<String> logs = appender.list.stream().map(ILoggingEvent::getFormattedMessage).toList();

        assertThat(logs).isNotEmpty();
        assertThat(logs).noneMatch(message -> message.contains(DOCUMENT) || message.contains("98765"));
    }
}

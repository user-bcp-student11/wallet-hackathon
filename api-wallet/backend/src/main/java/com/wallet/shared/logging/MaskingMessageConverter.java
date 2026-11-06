package com.wallet.shared.logging;

import ch.qos.logback.classic.pattern.MessageConverter;
import ch.qos.logback.classic.spi.ILoggingEvent;
import java.util.regex.Pattern;

/** Red de seguridad: enmascara fechas y números largos (DNI, CE, celular, OTP) que se cuelen en un mensaje. */
public class MaskingMessageConverter extends MessageConverter {

    private static final Pattern DATE = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");
    private static final Pattern LONG_NUMBER = Pattern.compile("(?<![\\w-])\\d{6,12}(?![\\w-])");

    @Override
    public String convert(ILoggingEvent event) {
        return mask(super.convert(event));
    }

    public static String mask(String message) {
        String withoutDates = DATE.matcher(message).replaceAll("****-**-**");
        return LONG_NUMBER.matcher(withoutDates).replaceAll("***");
    }
}

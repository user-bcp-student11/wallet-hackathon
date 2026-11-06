package com.wallet.support;

import org.testcontainers.containers.PostgreSQLContainer;

/** PostgreSQL de pruebas con Testcontainers, iniciado una sola vez por ejecución. */
public final class TestDatabase {

    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");

    static {
        POSTGRES.start();
    }

    private TestDatabase() {
    }

    public static String jdbcUrl() {
        return POSTGRES.getJdbcUrl();
    }

    public static String user() {
        return POSTGRES.getUsername();
    }

    public static String password() {
        return POSTGRES.getPassword();
    }
}

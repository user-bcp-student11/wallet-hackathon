package com.wallet.shared.web;

import com.wallet.shared.web.MockLatency.InvalidMockLatencyException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class MockLatencyFilter extends OncePerRequestFilter {

    static final String HEADER = "X-Mock-Latency-Ms";
    static final String QUERY_PARAM = "latency";

    private final ErrorResponseWriter errors;

    public MockLatencyFilter(ErrorResponseWriter errors) {
        this.errors = errors;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        MockLatency latency;
        try {
            latency = MockLatency.resolve(request.getHeader(HEADER), request.getParameter(QUERY_PARAM));
        } catch (InvalidMockLatencyException e) {
            errors.write(response, HttpStatus.BAD_REQUEST, "INVALID_MOCK_LATENCY");
            return;
        }
        response.setHeader(HEADER, String.valueOf(latency.millis()));
        pause(latency);
        chain.doFilter(request, response);
    }

    private static void pause(MockLatency latency) {
        try {
            Thread.sleep(latency.millis());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}

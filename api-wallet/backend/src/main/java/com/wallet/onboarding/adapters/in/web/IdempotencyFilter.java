package com.wallet.onboarding.adapters.in.web;

import com.wallet.onboarding.application.port.out.IdempotencyStorePort;
import com.wallet.onboarding.application.port.out.IdempotencyStorePort.StoredResponse;
import com.wallet.shared.web.UserHeader;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

/** Repite la respuesta original cuando llega la misma Idempotency-Key para el mismo usuario y recurso. */
@Component
public class IdempotencyFilter extends OncePerRequestFilter {

    static final String IDEMPOTENCY_HEADER = "Idempotency-Key";
    private static final String ONBOARDINGS_PATH = "/api/v1/onboardings";

    private final IdempotencyStorePort store;

    public IdempotencyFilter(IdempotencyStorePort store) {
        this.store = store;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !HttpMethod.POST.matches(request.getMethod())
                || !request.getRequestURI().startsWith(ONBOARDINGS_PATH)
                || request.getHeader(IDEMPOTENCY_HEADER) == null
                || request.getHeader(UserHeader.NAME) == null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String key = request.getHeader(IDEMPOTENCY_HEADER);
        String scope = request.getHeader(UserHeader.NAME) + "|" + request.getRequestURI();

        Optional<StoredResponse> previous = store.find(scope, key);
        if (previous.isPresent()) {
            replay(previous.get(), response);
            return;
        }

        ContentCachingResponseWrapper wrapper = new ContentCachingResponseWrapper(response);
        chain.doFilter(request, wrapper);
        if (isSuccessful(wrapper.getStatus())) {
            String body = new String(wrapper.getContentAsByteArray(), StandardCharsets.UTF_8);
            store.save(scope, key, new StoredResponse(wrapper.getStatus(), body));
        }
        wrapper.copyBodyToResponse();
    }

    private static boolean isSuccessful(int status) {
        return status >= 200 && status < 300;
    }

    private static void replay(StoredResponse stored, HttpServletResponse response) throws IOException {
        response.setStatus(stored.status());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setHeader("Idempotent-Replayed", "true");
        response.getOutputStream().write(stored.body().getBytes(StandardCharsets.UTF_8));
    }
}

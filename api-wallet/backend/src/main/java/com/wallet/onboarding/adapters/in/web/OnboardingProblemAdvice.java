package com.wallet.onboarding.adapters.in.web;

import com.wallet.onboarding.domain.FieldError;
import com.wallet.onboarding.domain.OnboardingConflictException;
import com.wallet.onboarding.domain.OnboardingNotFoundException;
import com.wallet.onboarding.domain.OnboardingNotInProgressException;
import com.wallet.onboarding.domain.OnboardingStatus;
import com.wallet.onboarding.domain.StepOutOfOrderException;
import com.wallet.onboarding.domain.ValidationFailedException;
import java.net.URI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class OnboardingProblemAdvice {

    private static final Logger log = LoggerFactory.getLogger(OnboardingProblemAdvice.class);

    @ExceptionHandler(ValidationFailedException.class)
    ProblemDetail validationFailed(ValidationFailedException e) {
        ProblemDetail problem = problem(HttpStatus.UNPROCESSABLE_ENTITY, "validation-error", "Datos inválidos",
                "Revisa los campos marcados y corrígelos para continuar.");
        problem.setProperty("errors", e.errors().stream().map(OnboardingProblemAdvice::toError).toList());
        return problem;
    }

    @ExceptionHandler(StepOutOfOrderException.class)
    ProblemDetail stepOutOfOrder(StepOutOfOrderException e) {
        ProblemDetail problem = problem(HttpStatus.CONFLICT, "step-out-of-order", "Paso fuera de orden",
                "Este no es el paso actual de tu registro. Continúa con el paso: " + e.currentStep().code() + ".");
        problem.setProperty("currentStep", e.currentStep().code());
        return problem;
    }

    @ExceptionHandler(OnboardingNotInProgressException.class)
    ProblemDetail notInProgress(OnboardingNotInProgressException e) {
        String detail = e.status() == OnboardingStatus.ABANDONED
                ? "Tu registro venció por inactividad. Inicia un registro nuevo."
                : "Tu registro ya fue completado.";
        ProblemDetail problem = problem(HttpStatus.CONFLICT, "onboarding-not-in-progress",
                "Registro no disponible", detail);
        problem.setProperty("onboardingStatus", e.status().name());
        return problem;
    }

    @ExceptionHandler(OnboardingConflictException.class)
    ProblemDetail conflict() {
        return problem(HttpStatus.CONFLICT, "concurrent-update", "Operación en curso",
                "Tu registro se está actualizando. Inténtalo de nuevo en unos segundos.");
    }

    @ExceptionHandler(OnboardingNotFoundException.class)
    ProblemDetail notFound() {
        return problem(HttpStatus.NOT_FOUND, "onboarding-not-found", "Registro no encontrado",
                "No encontramos tu registro. Inicia uno nuevo.");
    }

    private static ProblemDetail problem(HttpStatus status, String type, String title, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setType(URI.create("/problems/" + type));
        problem.setTitle(title);
        log.info("problem_returned type={} status={}", type, status.value());
        return problem;
    }

    private static ErrorItem toError(FieldError error) {
        return new ErrorItem(error.field(), error.message());
    }

    public record ErrorItem(String field, String message) {
    }
}

package com.wallet.onboarding.domain;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public record StepSequence(List<StepDefinition> steps) {

    public StepSequence {
        if (steps == null || steps.isEmpty()) {
            throw new IllegalArgumentException("La secuencia de pasos no puede estar vacía");
        }
        Set<StepType> types = new HashSet<>();
        steps.forEach(step -> {
            if (!types.add(step.type())) {
                throw new IllegalArgumentException("Paso repetido en la secuencia: " + step.code());
            }
        });
        steps = List.copyOf(steps);
    }

    public int size() {
        return steps.size();
    }

    public StepDefinition last() {
        return steps.getLast();
    }

    public Optional<StepDefinition> firstNotIn(Set<StepType> completed) {
        return steps.stream().filter(step -> !completed.contains(step.type())).findFirst();
    }

    public Optional<StepDefinition> nextAfter(StepType type) {
        int index = indexOf(type);
        return index + 1 < steps.size() ? Optional.of(steps.get(index + 1)) : Optional.empty();
    }

    public int indexOf(StepType type) {
        for (int i = 0; i < steps.size(); i++) {
            if (steps.get(i).type() == type) {
                return i;
            }
        }
        return -1;
    }

    public boolean isCompletedBy(Set<StepType> completed) {
        return firstNotIn(completed).isEmpty();
    }
}

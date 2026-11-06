import { InjectionToken, Injectable, inject, isDevMode, signal } from '@angular/core';
import { Attribution, AttributionStore } from './attribution';

export type OnboardingStep = 'datos' | 'verificacion' | 'wallet';

/** Resultado con el que se cierra el flujo. */
export type FlowOutcome = 'activated' | 'pending_review' | 'rejected' | 'abandoned';

/**
 * Evento de analítica del onboarding. No contiene datos personales: ni el documento ni IDs de wallet.
 * - `onboarding_started`: inicio del flujo.
 * - `step_completed`: fin de un paso, con su duración.
 * - `flow_closed`: cierre del flujo, con el resultado y la duración total.
 */
export type OnboardingEvent =
  | { name: 'onboarding_started'; flowId: string; at: string; attribution: Attribution }
  | {
      name: 'step_completed';
      flowId: string;
      at: string;
      step: OnboardingStep;
      stepDurationMs: number;
      elapsedMs: number;
      attribution: Attribution;
    }
  | {
      name: 'flow_closed';
      flowId: string;
      at: string;
      outcome: FlowOutcome;
      lastStep: OnboardingStep;
      elapsedMs: number;
      attribution: Attribution;
    };

/** Destino de los eventos. Hoy no hay endpoint de analítica en el contrato: se reemplaza al existir. */
export interface AnalyticsSink {
  send(event: OnboardingEvent): void;
}

export const ANALYTICS_SINK = new InjectionToken<AnalyticsSink>('ANALYTICS_SINK', {
  providedIn: 'root',
  factory: () => ({
    send: (event) => {
      if (isDevMode()) console.info('[analytics]', event);
    },
  }),
});

/** Reloj inyectable para medir duraciones (reemplazable en pruebas). */
export const ANALYTICS_CLOCK = new InjectionToken<() => number>('ANALYTICS_CLOCK', {
  providedIn: 'root',
  factory: () => () => Date.now(),
});

function newFlowId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `flow-${Math.random().toString(36).slice(2)}`;
}

const STEP_ORDER: OnboardingStep[] = ['datos', 'verificacion', 'wallet'];

/** Registra el inicio, el fin de cada paso y el cierre del onboarding. */
@Injectable({ providedIn: 'root' })
export class OnboardingAnalytics {
  private readonly sink = inject(ANALYTICS_SINK);
  private readonly now = inject(ANALYTICS_CLOCK);
  private readonly attribution = inject(AttributionStore);

  /** Eventos emitidos en esta sesión (en memoria), útil para depurar y para pruebas. */
  readonly events = signal<OnboardingEvent[]>([]);

  private flow: { id: string; startedAt: number; stepStartedAt: number; lastStep: OnboardingStep } | null = null;

  get active(): boolean {
    return this.flow !== null;
  }

  /** Inicia un flujo si no hay uno abierto. */
  start(): void {
    if (this.flow) return;
    const at = this.now();
    this.flow = { id: newFlowId(), startedAt: at, stepStartedAt: at, lastStep: 'datos' };
    this.emit({ name: 'onboarding_started', flowId: this.flow.id, at: new Date(at).toISOString(), attribution: this.attr() });
  }

  /** Marca un paso como completado y empieza a medir el siguiente. */
  completeStep(step: OnboardingStep): void {
    if (!this.flow) return;
    const at = this.now();
    this.emit({
      name: 'step_completed',
      flowId: this.flow.id,
      at: new Date(at).toISOString(),
      step,
      stepDurationMs: at - this.flow.stepStartedAt,
      elapsedMs: at - this.flow.startedAt,
      attribution: this.attr(),
    });
    const next = STEP_ORDER[STEP_ORDER.indexOf(step) + 1];
    this.flow.stepStartedAt = at;
    this.flow.lastStep = next ?? step;
  }

  /** Cierra el flujo con su resultado. */
  close(outcome: FlowOutcome): void {
    if (!this.flow) return;
    const at = this.now();
    this.emit({
      name: 'flow_closed',
      flowId: this.flow.id,
      at: new Date(at).toISOString(),
      outcome,
      lastStep: this.flow.lastStep,
      elapsedMs: at - this.flow.startedAt,
      attribution: this.attr(),
    });
    this.flow = null;
  }

  private attr(): Attribution {
    return { ...this.attribution.value() };
  }

  private emit(event: OnboardingEvent): void {
    this.events.update((events) => [...events, event]);
    this.sink.send(event);
  }
}

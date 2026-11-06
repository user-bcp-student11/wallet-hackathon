import { TestBed } from '@angular/core/testing';
import { AttributionStore, parseAttribution } from './attribution';
import { ANALYTICS_CLOCK, ANALYTICS_SINK, OnboardingAnalytics, OnboardingEvent } from './onboarding-analytics';

describe('parseAttribution', () => {
  it('lee channel, campaign y ref de la URL', () => {
    expect(parseAttribution('?channel=facebook&campaign=mvp-lima_01&ref=abc')).toEqual({
      channel: 'facebook',
      campaign: 'mvp-lima_01',
      ref: 'abc',
    });
  });

  it('descarta valores que no son identificadores de campaña', () => {
    expect(parseAttribution('?channel=ana@mail.com&campaign=' + 'x'.repeat(80))).toEqual({
      channel: null,
      campaign: null,
      ref: null,
    });
  });
});

describe('OnboardingAnalytics', () => {
  let sent: OnboardingEvent[];
  let now: number;

  beforeEach(() => {
    sent = [];
    now = 1_000_000;
    TestBed.configureTestingModule({
      providers: [
        { provide: ANALYTICS_SINK, useValue: { send: (e: OnboardingEvent) => sent.push(e) } },
        { provide: ANALYTICS_CLOCK, useValue: () => now },
      ],
    });
    TestBed.inject(AttributionStore).capture('?channel=tiktok&campaign=launch');
  });

  it('mide la duración de cada paso y del flujo, con la atribución', () => {
    const analytics = TestBed.inject(OnboardingAnalytics);
    analytics.start();
    now += 30_000;
    analytics.completeStep('datos');
    now += 15_000;
    analytics.completeStep('verificacion');
    now += 5_000;
    analytics.completeStep('wallet');
    analytics.close('activated');

    expect(sent.map((e) => e.name)).toEqual([
      'onboarding_started',
      'step_completed',
      'step_completed',
      'step_completed',
      'flow_closed',
    ]);
    expect(sent[1]).toMatchObject({ step: 'datos', stepDurationMs: 30_000, elapsedMs: 30_000 });
    expect(sent[2]).toMatchObject({ step: 'verificacion', stepDurationMs: 15_000, elapsedMs: 45_000 });
    expect(sent[4]).toMatchObject({ outcome: 'activated', elapsedMs: 50_000 });
    expect(sent.every((e) => e.attribution.channel === 'tiktok' && e.attribution.campaign === 'launch')).toBe(true);
    expect(new Set(sent.map((e) => e.flowId)).size).toBe(1);
  });

  it('no inicia dos flujos a la vez ni emite eventos sin flujo', () => {
    const analytics = TestBed.inject(OnboardingAnalytics);
    analytics.completeStep('datos');
    analytics.close('abandoned');
    expect(sent).toEqual([]);

    analytics.start();
    analytics.start();
    expect(sent.filter((e) => e.name === 'onboarding_started')).toHaveLength(1);
  });
});

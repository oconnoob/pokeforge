export interface TurnTimeline {
  impactMs: number;
  logRevealMs: number;
}

export const DEFAULT_TURN_TIMELINE: TurnTimeline = {
  impactMs: 220,
  logRevealMs: 520
};

export const sanitizeTurnTimeline = (timeline: Partial<TurnTimeline> = {}): TurnTimeline => {
  const impactMs = Math.max(80, Math.floor(timeline.impactMs ?? DEFAULT_TURN_TIMELINE.impactMs));
  const logRevealMs = Math.max(impactMs + 120, Math.floor(timeline.logRevealMs ?? DEFAULT_TURN_TIMELINE.logRevealMs));

  return {
    impactMs,
    logRevealMs
  };
};

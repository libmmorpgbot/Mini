const CYCLE_DURATION_MS = 30000;

/**
 * Tracks a continuous day/night loop (full day -> night -> day every
 * CYCLE_DURATION_MS) and reports a smooth 0..1 "day factor" each tick
 * (1 = full day, 0 = full night) via a cosine wave, so the transition
 * has no visible jump at the loop boundary.
 */
export class DayNightCycle {
  private elapsedMs = 0;

  update(deltaMS: number): number {
    this.elapsedMs = (this.elapsedMs + deltaMS) % CYCLE_DURATION_MS;
    const t = this.elapsedMs / CYCLE_DURATION_MS;
    return (Math.cos(t * Math.PI * 2) + 1) / 2;
  }
}

export function lerpColor(colorA: number, colorB: number, t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  const ar = (colorA >> 16) & 0xff;
  const ag = (colorA >> 8) & 0xff;
  const ab = colorA & 0xff;
  const br = (colorB >> 16) & 0xff;
  const bg = (colorB >> 8) & 0xff;
  const bb = colorB & 0xff;

  const r = Math.round(ar + (br - ar) * clamped);
  const g = Math.round(ag + (bg - ag) * clamped);
  const b = Math.round(ab + (bb - ab) * clamped);

  return (r << 16) | (g << 8) | b;
}

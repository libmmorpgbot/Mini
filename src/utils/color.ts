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

export function luminance(color: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

import * as PIXI from 'pixi.js';
import { lerpColor, luminance } from '../utils/color';

type DrawFn = (g: PIXI.Graphics, width: number, height: number) => void;

const SEGMENT_COUNT = 3;
const SKY_HEIGHT_RATIO = 0.79;
const GROUND_Y_RATIO = 0.84;

/** Real screen px per "art pixel" -- the lower, the chunkier/more pixelated the result. */
const PIXEL_SIZE = 3;

export interface ParallaxPalette {
  skyTop: number;
  skyMid: number;
  skyBottom: number;
  hillFar: number;
  hillNear: number;
  groundTop: number;
  groundBottom: number;
  path: number;
  accent: number;
  cloud: number;
}

export type Landmark = 'trees' | 'graves' | 'fortress' | 'rift' | 'volcano';

export const DEFAULT_PALETTE: ParallaxPalette = {
  skyTop: 0x3d7ab8,
  skyMid: 0x6fa8d8,
  skyBottom: 0xbfe0e8,
  hillFar: 0x6a8fae,
  hillNear: 0x3f6b52,
  groundTop: 0x6a9a4e,
  groundBottom: 0x3a5c2c,
  path: 0xc9b27a,
  accent: 0xfff2c0,
  cloud: 0xffffff,
};

const SUN_X_RATIO = 0.77;
const SUN_Y_RATIO = 0.15;

const CLOUD_WIDTH = 56;
const CLOUD_HEIGHT = 30;
const CLOUD_DRIFT_SPEED = 6; // px/sec, independent of world scroll speed

/**
 * Renders `draw` at full-resolution coordinates but bakes it into a
 * low-resolution, nearest-neighbour-scaled texture, so smooth vector shapes
 * come out as genuine blocky pixel art instead of an antialiased illustration.
 *
 * Width/height are padded up to an exact multiple of PIXEL_SIZE first --
 * otherwise the fractional resolution scale produces a non-integer
 * texel-to-pixel ratio, which shows up as a stray nearest-neighbour seam
 * column when the texture is stretched back up.
 */
function renderPixelated(renderer: PIXI.IRenderer, width: number, height: number, draw: DrawFn): PIXI.Sprite {
  const paddedWidth = Math.ceil(width / PIXEL_SIZE) * PIXEL_SIZE;
  const paddedHeight = Math.ceil(height / PIXEL_SIZE) * PIXEL_SIZE;

  const graphics = new PIXI.Graphics();
  draw(graphics, paddedWidth, paddedHeight);

  const renderTexture = PIXI.RenderTexture.create({
    width: paddedWidth,
    height: paddedHeight,
    resolution: 1 / PIXEL_SIZE,
    scaleMode: PIXI.SCALE_MODES.NEAREST,
  });
  renderer.render(graphics, { renderTexture });
  graphics.destroy();

  return new PIXI.Sprite(renderTexture);
}

class ParallaxLayer {
  readonly container: PIXI.Container;
  private readonly segments: PIXI.Container[] = [];
  private readonly segmentWidth: number;
  private readonly factor: number;

  constructor(renderer: PIXI.IRenderer, width: number, height: number, factor: number, draw: DrawFn) {
    this.factor = factor;
    this.segmentWidth = width;
    this.container = new PIXI.Container();

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const segment = new PIXI.Container();
      segment.addChild(renderPixelated(renderer, width, height, draw));
      segment.x = i * width;
      this.segments.push(segment);
      this.container.addChild(segment);
    }
  }

  update(deltaSeconds: number, baseSpeed: number): void {
    const dx = baseSpeed * this.factor * deltaSeconds;
    const totalWidth = this.segmentWidth * this.segments.length;

    for (const segment of this.segments) {
      segment.x -= dx;
      if (segment.x <= -this.segmentWidth) {
        segment.x += totalWidth;
      }
    }
  }
}

class CloudLayer {
  readonly container: PIXI.Container;
  private readonly clouds: { sprite: PIXI.Sprite; speedFactor: number }[] = [];
  private readonly width: number;

  constructor(renderer: PIXI.IRenderer, width: number, height: number, palette: ParallaxPalette) {
    this.width = width;
    this.container = new PIXI.Container();

    const positions = [
      { xRatio: 0.18, yRatio: 0.18, scale: 1, speedFactor: 1 },
      { xRatio: 0.6, yRatio: 0.27, scale: 0.75, speedFactor: 0.7 },
    ];

    for (const pos of positions) {
      const sprite = renderPixelated(renderer, CLOUD_WIDTH, CLOUD_HEIGHT, makeDrawCloudShape(palette));
      sprite.anchor.set(0.5);
      sprite.scale.set(pos.scale);
      sprite.x = width * pos.xRatio;
      sprite.y = height * pos.yRatio;
      this.clouds.push({ sprite, speedFactor: pos.speedFactor });
      this.container.addChild(sprite);
    }
  }

  update(deltaSeconds: number): void {
    const margin = CLOUD_WIDTH;
    for (const { sprite, speedFactor } of this.clouds) {
      sprite.x -= CLOUD_DRIFT_SPEED * speedFactor * deltaSeconds;
      if (sprite.x < -margin) {
        sprite.x = this.width + margin;
      }
    }
  }
}

export class ParallaxBackground {
  readonly container: PIXI.Container;
  private readonly layers: ParallaxLayer[];
  private readonly clouds: CloudLayer;

  constructor(
    renderer: PIXI.IRenderer,
    width: number,
    height: number,
    palette: ParallaxPalette = DEFAULT_PALETTE,
    landmark?: Landmark
  ) {
    this.container = new PIXI.Container();

    this.layers = [
      new ParallaxLayer(renderer, width, height, 0.1, makeDrawSky(palette)),
      new ParallaxLayer(renderer, width, height, 0.3, makeDrawFarHills(palette)),
      new ParallaxLayer(renderer, width, height, 0.55, makeDrawNearHills(palette)),
      new ParallaxLayer(renderer, width, height, 1, makeDrawGround(palette)),
    ];
    this.clouds = new CloudLayer(renderer, width, height, palette);

    this.container.addChild(this.layers[0].container);
    this.container.addChild(this.clouds.container);
    this.container.addChild(this.layers[1].container);
    this.container.addChild(this.layers[2].container);

    if (landmark) {
      const landmarkLayer = new ParallaxLayer(renderer, width, height, 0.65, makeDrawLandmark(landmark, palette));
      this.layers.push(landmarkLayer);
      this.container.addChild(landmarkLayer.container);
    }

    this.container.addChild(this.layers[3].container);
  }

  update(deltaSeconds: number, baseSpeed: number): void {
    for (const layer of this.layers) {
      layer.update(deltaSeconds, baseSpeed);
    }
    this.clouds.update(deltaSeconds);
  }
}

function drawGradientRect(
  g: PIXI.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  stops: number[],
  steps: number
): void {
  const bandHeight = height / steps;
  const segCount = stops.length - 1;

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const segPos = t * segCount;
    const segIndex = Math.min(segCount - 1, Math.floor(segPos));
    const localT = segPos - segIndex;
    const color = lerpColor(stops[segIndex], stops[segIndex + 1], localT);

    g.beginFill(color);
    g.drawRect(x, y + i * bandHeight, width, bandHeight + 1);
    g.endFill();
  }
}

interface SpeckleTone {
  color: number;
  alpha: number;
}

/**
 * Scatters small flecks over a rectangular region. Because layers are baked
 * down to a low-resolution texture (see PIXEL_SIZE) and re-scaled with
 * nearest-neighbour filtering, flecks smaller than a "pixel" blend into the
 * surrounding fill during that downsample -- turning into a grainy, textured
 * dither instead of visible dots.
 */
function speckleRect(
  g: PIXI.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  tones: SpeckleTone[],
  density: number,
  minSize: number,
  maxSize: number
): void {
  const count = Math.round(width * height * density);
  for (let i = 0; i < count; i++) {
    const tone = tones[Math.floor(Math.random() * tones.length)];
    const size = minSize + Math.random() * (maxSize - minSize);
    const px = x + Math.random() * width;
    const py = y + Math.random() * height;

    g.beginFill(tone.color, tone.alpha);
    g.drawRect(px, py, size, size);
    g.endFill();
  }
}

/** Same idea as speckleRect but sampled uniformly inside a triangle (barycentric). */
function speckleTriangle(
  g: PIXI.Graphics,
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  tones: SpeckleTone[],
  count: number,
  minSize: number,
  maxSize: number
): void {
  for (let i = 0; i < count; i++) {
    let r1 = Math.random();
    let r2 = Math.random();
    if (r1 + r2 > 1) {
      r1 = 1 - r1;
      r2 = 1 - r2;
    }
    const x = p1[0] + r1 * (p2[0] - p1[0]) + r2 * (p3[0] - p1[0]);
    const y = p1[1] + r1 * (p2[1] - p1[1]) + r2 * (p3[1] - p1[1]);
    const tone = tones[Math.floor(Math.random() * tones.length)];
    const size = minSize + Math.random() * (maxSize - minSize);

    g.beginFill(tone.color, tone.alpha);
    g.drawRect(x, y, size, size);
    g.endFill();
  }
}

function makeDrawCloudShape(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    const cx = width / 2;
    const cy = height * 0.6;

    g.beginFill(palette.cloud, 0.95);
    g.drawEllipse(cx, cy, width * 0.5, height * 0.32);
    g.drawEllipse(cx - width * 0.26, cy + height * 0.08, width * 0.28, height * 0.22);
    g.drawEllipse(cx + width * 0.26, cy + height * 0.06, width * 0.3, height * 0.24);
    g.drawEllipse(cx - width * 0.05, cy - height * 0.18, width * 0.26, height * 0.2);
    g.endFill();
  };
}

function makeDrawSky(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    const skyHeight = height * SKY_HEIGHT_RATIO;

    drawGradientRect(g, 0, 0, width, skyHeight, [palette.skyTop, palette.skyMid, palette.skyBottom], 14);

    // Fine grain breaks up the flat gradient bands into something closer to
    // hazy, textured air instead of a smooth print.
    speckleRect(
      g,
      0,
      0,
      width,
      skyHeight,
      [
        { color: lerpColor(palette.skyMid, 0xffffff, 0.5), alpha: 0.06 },
        { color: lerpColor(palette.skyBottom, 0x000000, 0.35), alpha: 0.05 },
      ],
      0.012,
      1,
      2
    );

    // Dark biomes (night skies, hellscapes) read as textured starfields
    // instead of a flat void.
    if (luminance(palette.skyTop) < 0.28) {
      speckleRect(
        g,
        0,
        0,
        width,
        skyHeight * 0.75,
        [
          { color: palette.cloud, alpha: 0.85 },
          { color: palette.accent, alpha: 0.6 },
        ],
        0.006,
        1,
        1.6
      );
    }

    const sunX = width * SUN_X_RATIO;
    const sunY = height * SUN_Y_RATIO;

    g.beginFill(palette.accent, 0.35);
    g.drawCircle(sunX, sunY, 46);
    g.endFill();

    g.beginFill(palette.accent, 0.95);
    g.drawCircle(sunX, sunY, 24);
    g.endFill();
  };
}

function hillCurveY(x: number, width: number, height: number, baseRatio: number, ampRatio: number, phase: number): number {
  const baseY = height * baseRatio;
  const amplitude = height * ampRatio;
  const t = x / width;
  return baseY - amplitude * (0.5 + 0.5 * Math.sin(t * Math.PI * 2.2 + phase));
}

/**
 * Sine-sampled silhouette built row-by-row (rather than a hand-authored
 * polygon) so it can never self-intersect regardless of amplitude/phase.
 */
function drawHillSilhouette(
  g: PIXI.Graphics,
  width: number,
  height: number,
  baseRatio: number,
  ampRatio: number,
  phase: number,
  color: number
): void {
  const segments = 24;
  const points: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = t * width;
    const y = hillCurveY(x, width, height, baseRatio, ampRatio, phase);
    points.push(x, y);
  }

  points.push(width, height);
  points.push(0, height);

  g.beginFill(color);
  g.drawPolygon(points);
  g.endFill();
}

/** Scatters flecks confined to the filled area under the hill's silhouette curve. */
function speckleHill(
  g: PIXI.Graphics,
  width: number,
  height: number,
  baseRatio: number,
  ampRatio: number,
  phase: number,
  tones: SpeckleTone[],
  density: number,
  minSize: number,
  maxSize: number
): void {
  const count = Math.round(width * height * density);
  for (let i = 0; i < count; i++) {
    const px = Math.random() * width;
    const curveY = hillCurveY(px, width, height, baseRatio, ampRatio, phase);
    const py = curveY + Math.random() * (height - curveY);
    const tone = tones[Math.floor(Math.random() * tones.length)];
    const size = minSize + Math.random() * (maxSize - minSize);

    g.beginFill(tone.color, tone.alpha);
    g.drawRect(px, py, size, size);
    g.endFill();
  }
}

function makeDrawFarHills(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    drawHillSilhouette(g, width, height, 0.6, 0.07, 0.4, palette.hillFar);
    speckleHill(
      g,
      width,
      height,
      0.6,
      0.07,
      0.4,
      [
        { color: lerpColor(palette.hillFar, 0xffffff, 0.2), alpha: 0.18 },
        { color: lerpColor(palette.hillFar, 0x000000, 0.25), alpha: 0.16 },
      ],
      0.02,
      1.5,
      3
    );
  };
}

function makeDrawNearHills(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    drawHillSilhouette(g, width, height, 0.74, 0.05, 2.1, palette.hillNear);
    speckleHill(
      g,
      width,
      height,
      0.74,
      0.05,
      2.1,
      [
        { color: lerpColor(palette.hillNear, palette.accent, 0.25), alpha: 0.14 },
        { color: lerpColor(palette.hillNear, 0x000000, 0.3), alpha: 0.2 },
      ],
      0.028,
      1.5,
      3.5
    );
  };
}

function makeDrawGround(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    const groundY = height * GROUND_Y_RATIO;
    const groundHeight = height - groundY;

    drawGradientRect(g, 0, groundY, width, groundHeight, [palette.groundTop, palette.groundBottom], 10);

    // Grass/dirt stipple so the ground reads as broken-up terrain rather
    // than a smooth two-stop gradient.
    speckleRect(
      g,
      0,
      groundY,
      width,
      groundHeight,
      [
        { color: lerpColor(palette.groundTop, palette.accent, 0.3), alpha: 0.28 },
        { color: lerpColor(palette.groundTop, 0xffffff, 0.2), alpha: 0.16 },
        { color: lerpColor(palette.groundBottom, 0x000000, 0.35), alpha: 0.3 },
      ],
      0.05,
      1.5,
      3.5
    );

    const laneHeight = height * 0.025;

    g.beginFill(palette.groundBottom, 0.4);
    g.drawRect(0, groundY, width, 4);
    g.endFill();

    g.beginFill(palette.path, 0.9);
    g.drawRect(0, groundY + 4, width, laneHeight);
    g.endFill();

    // Pebbles/wear marks along the path.
    speckleRect(
      g,
      0,
      groundY + 4,
      width,
      laneHeight,
      [
        { color: lerpColor(palette.path, 0x000000, 0.35), alpha: 0.35 },
        { color: lerpColor(palette.path, 0xffffff, 0.3), alpha: 0.25 },
      ],
      0.06,
      1,
      2.5
    );
  };
}

/** Darker than hillNear so foreground landmarks read as silhouettes instead of vanishing into the hill. */
function landmarkColor(palette: ParallaxPalette): number {
  return lerpColor(palette.hillNear, 0x000000, 0.45);
}

/** One themed silhouette per location, sitting between the near hills and the ground. */
function makeDrawLandmark(landmark: Landmark, palette: ParallaxPalette): DrawFn {
  switch (landmark) {
    case 'trees':
      return makeDrawTrees(palette);
    case 'graves':
      return makeDrawGraves(palette);
    case 'fortress':
      return makeDrawFortress(palette);
    case 'rift':
      return makeDrawRift(palette);
    case 'volcano':
      return makeDrawVolcano(palette);
  }
}

function makeDrawTrees(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    const baseY = height * 0.78;
    const positions = [0.08, 0.24, 0.4, 0.58, 0.74, 0.9];

    const color = landmarkColor(palette);
    const foliageTones: SpeckleTone[] = [
      { color: lerpColor(color, palette.accent, 0.3), alpha: 0.3 },
      { color: lerpColor(color, 0x000000, 0.35), alpha: 0.28 },
    ];

    positions.forEach((xRatio, i) => {
      const x = width * xRatio;
      const h = height * (0.15 + (i % 3) * 0.02);
      const w = h * 0.55;

      const tiers: [[number, number], [number, number], [number, number]][] = [
        [
          [x - w * 0.5, baseY - h * 0.2],
          [x + w * 0.5, baseY - h * 0.2],
          [x, baseY - h * 0.55],
        ],
        [
          [x - w * 0.4, baseY - h * 0.45],
          [x + w * 0.4, baseY - h * 0.45],
          [x, baseY - h * 0.8],
        ],
        [
          [x - w * 0.3, baseY - h * 0.7],
          [x + w * 0.3, baseY - h * 0.7],
          [x, baseY - h],
        ],
      ];

      g.beginFill(color);
      g.drawRect(x - w * 0.06, baseY - h * 0.25, w * 0.12, h * 0.25);
      for (const [p1, p2, p3] of tiers) {
        g.drawPolygon([...p1, ...p2, ...p3]);
      }
      g.endFill();

      for (const [p1, p2, p3] of tiers) {
        speckleTriangle(g, p1, p2, p3, foliageTones, 10, 1.5, 3);
      }
    });
  };
}

function makeDrawGraves(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    const baseY = height * 0.8;
    const stones = [
      { xRatio: 0.1, h: 0.09, w: 0.05, cross: false },
      { xRatio: 0.27, h: 0.12, w: 0.045, cross: true },
      { xRatio: 0.46, h: 0.08, w: 0.055, cross: false },
      { xRatio: 0.65, h: 0.11, w: 0.05, cross: false },
      { xRatio: 0.84, h: 0.07, w: 0.045, cross: true },
    ];

    const color = landmarkColor(palette);
    const stoneTones: SpeckleTone[] = [
      { color: lerpColor(color, 0xffffff, 0.25), alpha: 0.22 },
      { color: lerpColor(color, 0x000000, 0.35), alpha: 0.25 },
    ];

    for (const s of stones) {
      const x = width * s.xRatio;
      const h = height * s.h;
      const w = width * s.w;

      g.beginFill(color);
      if (s.cross) {
        g.drawRect(x - w * 0.12, baseY - h, w * 0.24, h);
        g.drawRect(x - w * 0.5, baseY - h * 0.62, w, w * 0.24);
      } else {
        g.drawRoundedRect(x - w / 2, baseY - h, w, h, w * 0.4);
      }
      g.endFill();

      speckleRect(g, x - w / 2, baseY - h, w, h, stoneTones, 0.3, 1, 2.5);
    }
  };
}

function makeDrawFortress(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    const baseY = height * 0.8;
    const x = width * 0.55;
    const color = landmarkColor(palette);

    g.beginFill(color);
    g.drawRect(x - 70, baseY - 46, 140, 46);
    g.drawRect(x - 90, baseY - 70, 26, 70);
    g.drawRect(x + 64, baseY - 70, 26, 70);
    g.drawRect(x - 14, baseY - 82, 28, 82);

    for (let i = -1; i <= 1; i++) {
      g.drawRect(x - 90 + i * 8, baseY - 76, 6, 8);
      g.drawRect(x + 64 + i * 8, baseY - 76, 6, 8);
    }
    g.endFill();

    const stoneTones: SpeckleTone[] = [
      { color: lerpColor(color, 0xffffff, 0.25), alpha: 0.2 },
      { color: lerpColor(color, 0x000000, 0.35), alpha: 0.22 },
    ];
    speckleRect(g, x - 90, baseY - 82, 180, 82, stoneTones, 0.06, 1, 2.5);

    g.beginFill(palette.accent, 0.85);
    g.drawPolygon([x, baseY - 82, x + 14, baseY - 78, x, baseY - 74]);
    g.endFill();

    g.beginFill(palette.accent, 0.55);
    g.drawRect(x - 4, baseY - 64, 8, 10);
    g.drawRect(x - 84, baseY - 44, 6, 8);
    g.drawRect(x + 78, baseY - 44, 6, 8);
    g.endFill();
  };
}

function makeDrawRift(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    const baseY = height * 0.82;
    const x = width * 0.5;
    const color = landmarkColor(palette);

    g.beginFill(color);
    g.drawPolygon([x - 95, baseY, x - 35, baseY, x - 60, baseY - 65]);
    g.drawPolygon([x + 35, baseY, x + 95, baseY, x + 65, baseY - 75]);
    g.endFill();

    const rockTones: SpeckleTone[] = [
      { color: lerpColor(color, palette.accent, 0.3), alpha: 0.28 },
      { color: lerpColor(color, 0x000000, 0.3), alpha: 0.24 },
    ];
    speckleTriangle(g, [x - 95, baseY], [x - 35, baseY], [x - 60, baseY - 65], rockTones, 14, 1.5, 3);
    speckleTriangle(g, [x + 35, baseY], [x + 95, baseY], [x + 65, baseY - 75], rockTones, 14, 1.5, 3);

    g.beginFill(palette.accent, 0.85);
    g.drawPolygon([x - 12, baseY, x + 8, baseY, x + 4, baseY - 50, x - 6, baseY - 32]);
    g.endFill();

    // Embers drifting off the crack.
    speckleRect(
      g,
      x - 20,
      baseY - 70,
      40,
      70,
      [
        { color: palette.accent, alpha: 0.6 },
        { color: 0xffffff, alpha: 0.4 },
      ],
      0.02,
      1,
      2
    );

    g.beginFill(palette.accent, 0.35);
    g.drawEllipse(x, baseY - 2, 42, 10);
    g.endFill();
  };
}

function makeDrawVolcano(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    const baseY = height * 0.78;
    const x = width * 0.62;
    const color = landmarkColor(palette);

    g.beginFill(color);
    g.drawPolygon([x - 90, baseY, x + 90, baseY, x + 20, baseY - 100, x - 20, baseY - 100]);
    g.endFill();

    const rockTones: SpeckleTone[] = [
      { color: lerpColor(color, 0xffffff, 0.2), alpha: 0.2 },
      { color: lerpColor(color, 0x000000, 0.3), alpha: 0.26 },
    ];
    speckleTriangle(g, [x - 90, baseY], [x + 20, baseY - 100], [x - 20, baseY - 100], rockTones, 14, 1.5, 3.5);
    speckleTriangle(g, [x - 90, baseY], [x + 90, baseY], [x + 20, baseY - 100], rockTones, 14, 1.5, 3.5);

    g.beginFill(palette.accent, 0.9);
    g.drawEllipse(x, baseY - 100, 22, 8);
    g.endFill();

    g.beginFill(palette.accent, 0.6);
    g.drawPolygon([x - 8, baseY - 96, x + 8, baseY - 96, x + 16, baseY - 20, x - 16, baseY - 20]);
    g.endFill();

    // Glowing cracks trickling down the slope.
    speckleTriangle(
      g,
      [x - 90, baseY],
      [x + 20, baseY - 100],
      [x - 20, baseY - 100],
      [
        { color: palette.accent, alpha: 0.5 },
        { color: 0xffffff, alpha: 0.3 },
      ],
      6,
      1,
      2
    );
  };
}

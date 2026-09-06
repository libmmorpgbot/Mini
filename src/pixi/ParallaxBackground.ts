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

/** Two-tone "blob" -- a base shadow disc plus an offset highlight disc -- reads as a lit clump (bush, rock, leaf cluster) instead of a flat circle. */
function drawBlob(g: PIXI.Graphics, x: number, y: number, radius: number, base: number, highlight: number): void {
  g.beginFill(base, 0.92);
  g.drawCircle(x, y, radius);
  g.endFill();

  g.beginFill(highlight, 0.5);
  g.drawCircle(x - radius * 0.35, y - radius * 0.35, radius * 0.45);
  g.endFill();
}

/** A little fan of blades growing up from (x, y) -- the classic pixel-art grass tuft. */
function drawGrassTuft(g: PIXI.Graphics, x: number, y: number, size: number, color: number, alpha: number): void {
  g.lineStyle(Math.max(1, size * 0.3), color, alpha);
  g.moveTo(x, y);
  g.lineTo(x - size * 0.45, y - size);
  g.moveTo(x, y);
  g.lineTo(x, y - size * 1.2);
  g.moveTo(x, y);
  g.lineTo(x + size * 0.45, y - size);
  g.lineStyle(0);
}

/** A rounded cobblestone with its own shadow + highlight, for a worn path/road. */
function drawCobble(
  g: PIXI.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  base: number,
  highlight: number,
  shadow: number
): void {
  const r = Math.min(w, h) * 0.4;

  g.beginFill(shadow, 0.4);
  g.drawRoundedRect(x - w / 2, y - h / 2 + h * 0.15, w, h, r);
  g.endFill();

  g.beginFill(base, 0.9);
  g.drawRoundedRect(x - w / 2, y - h / 2, w, h * 0.85, r);
  g.endFill();

  g.beginFill(highlight, 0.45);
  g.drawRoundedRect(x - w / 2 + w * 0.12, y - h / 2 + h * 0.08, w * 0.4, h * 0.3, r * 0.6);
  g.endFill();
}

/** A small twinkling star/ember -- a cross of thin strokes plus a bright core. */
function drawSparkle(g: PIXI.Graphics, x: number, y: number, size: number, color: number, alpha: number): void {
  g.lineStyle(Math.max(1, size * 0.3), color, alpha * 0.7);
  g.moveTo(x - size, y);
  g.lineTo(x + size, y);
  g.moveTo(x, y - size);
  g.lineTo(x, y + size);
  g.lineStyle(0);

  g.beginFill(color, alpha);
  g.drawCircle(x, y, size * 0.35);
  g.endFill();
}

/** Mortar lines across a rect -- staggered coursing reads as brick/stone masonry. */
function drawBrickCourses(
  g: PIXI.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
  rowHeight: number,
  brickWidth: number
): void {
  g.lineStyle(1, color, 0.35);

  const rows = Math.ceil(height / rowHeight);
  for (let r = 0; r <= rows; r++) {
    const ry = y + r * rowHeight;
    g.moveTo(x, ry);
    g.lineTo(x + width, ry);
  }

  for (let r = 0; r < rows; r++) {
    const ry = y + r * rowHeight;
    const offset = (r % 2) * (brickWidth / 2);
    for (let bx = x + offset; bx < x + width; bx += brickWidth) {
      g.moveTo(bx, ry);
      g.lineTo(bx, Math.min(ry + rowHeight, y + height));
    }
  }

  g.lineStyle(0);
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

    // Dark biomes (night skies, hellscapes) get a hand-placed starfield --
    // sparse, twinkling points read as "night" far better than fine noise.
    if (luminance(palette.skyTop) < 0.28) {
      const starCount = Math.round(width / 22);
      for (let i = 0; i < starCount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * skyHeight * 0.68;
        const big = Math.random() < 0.18;
        drawSparkle(g, x, y, big ? 2.2 : 1.1, big ? palette.accent : palette.cloud, big ? 0.9 : 0.55);
      }
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

/** Bush/rock clumps clinging to the ridge line, evenly spaced with light jitter so they read as deliberate foliage rather than noise. */
function scatterRidgeBlobs(
  g: PIXI.Graphics,
  width: number,
  height: number,
  baseRatio: number,
  ampRatio: number,
  phase: number,
  base: number,
  highlight: number,
  cellSize: number,
  minRadius: number,
  maxRadius: number,
  bandRatio: number
): void {
  const cols = Math.ceil(width / cellSize);
  for (let c = 0; c < cols; c++) {
    if (Math.random() < 0.25) continue;

    const x = (c + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.6;
    const curveY = hillCurveY(x, width, height, baseRatio, ampRatio, phase);
    const band = (height - curveY) * bandRatio;
    const y = curveY + Math.random() * band;
    const radius = minRadius + Math.random() * (maxRadius - minRadius);

    drawBlob(g, x, y, radius, base, highlight);
  }
}

function makeDrawFarHills(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    drawHillSilhouette(g, width, height, 0.6, 0.07, 0.4, palette.hillFar);
    scatterRidgeBlobs(
      g,
      width,
      height,
      0.6,
      0.07,
      0.4,
      palette.hillFar,
      lerpColor(palette.hillFar, 0xffffff, 0.22),
      48,
      2.5,
      4.5,
      0.16
    );
  };
}

function makeDrawNearHills(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    drawHillSilhouette(g, width, height, 0.74, 0.05, 2.1, palette.hillNear);
    scatterRidgeBlobs(
      g,
      width,
      height,
      0.74,
      0.05,
      2.1,
      palette.hillNear,
      lerpColor(palette.hillNear, palette.accent, 0.3),
      36,
      3,
      6,
      0.2
    );
  };
}

function makeDrawGround(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    const groundY = height * GROUND_Y_RATIO;
    const groundHeight = height - groundY;

    drawGradientRect(g, 0, groundY, width, groundHeight, [palette.groundTop, palette.groundBottom], 10);

    // A handful of soft dirt/moss patches break up the flat field.
    const patchDirt = lerpColor(palette.groundBottom, 0x000000, 0.2);
    const patchMoss = lerpColor(palette.groundTop, palette.accent, 0.25);
    const patchCount = Math.round(width / 70);
    for (let i = 0; i < patchCount; i++) {
      const x = Math.random() * width;
      const y = groundY + groundHeight * (0.3 + Math.random() * 0.65);
      const rw = 14 + Math.random() * 18;
      const rh = rw * (0.32 + Math.random() * 0.18);

      g.beginFill(i % 2 === 0 ? patchDirt : patchMoss, 0.16);
      g.drawEllipse(x, y, rw, rh);
      g.endFill();
    }

    // Grass tufts on a jittered grid, growing taller toward the foreground.
    const bladeLight = lerpColor(palette.groundTop, palette.accent, 0.35);
    const bladeDark = lerpColor(palette.groundTop, 0x000000, 0.25);
    const cell = 16;
    const cols = Math.ceil(width / cell);
    const rows = Math.max(1, Math.ceil(groundHeight / cell));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.35) continue;

        const t = r / Math.max(1, rows - 1);
        const x = (c + 0.5) * cell + (Math.random() - 0.5) * cell * 0.8;
        const y = groundY + (r + 0.9) * cell + (Math.random() - 0.5) * cell * 0.5;
        const size = 2 + t * 4 + Math.random() * 1.5;
        const color = Math.random() < 0.5 ? bladeLight : bladeDark;

        drawGrassTuft(g, x, y, size, color, 0.5 + t * 0.3);
      }
    }

    const laneHeight = height * 0.025;

    g.beginFill(palette.groundBottom, 0.4);
    g.drawRect(0, groundY, width, 4);
    g.endFill();

    g.beginFill(palette.path, 0.9);
    g.drawRect(0, groundY + 4, width, laneHeight);
    g.endFill();

    // Worn cobbles along the path.
    const stoneBase = lerpColor(palette.path, 0x000000, 0.15);
    const stoneHighlight = lerpColor(palette.path, 0xffffff, 0.35);
    const stoneShadow = lerpColor(palette.path, 0x000000, 0.4);
    const stoneCount = Math.max(1, Math.round(width / 34));

    for (let i = 0; i < stoneCount; i++) {
      const x = (i + 0.5) * (width / stoneCount) + (Math.random() - 0.5) * 10;
      const y = groundY + 4 + laneHeight * (0.35 + Math.random() * 0.4);
      const w = 5 + Math.random() * 4;
      const h = w * 0.6;

      drawCobble(g, x, y, w, h, stoneBase, stoneHighlight, stoneShadow);
    }
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
    const highlight = lerpColor(color, palette.accent, 0.35);

    positions.forEach((xRatio, i) => {
      const x = width * xRatio;
      const h = height * (0.15 + (i % 3) * 0.02);
      const w = h * 0.55;

      g.beginFill(color);
      g.drawRect(x - w * 0.06, baseY - h * 0.25, w * 0.12, h * 0.25);
      g.drawPolygon([x - w * 0.5, baseY - h * 0.2, x + w * 0.5, baseY - h * 0.2, x, baseY - h * 0.55]);
      g.drawPolygon([x - w * 0.4, baseY - h * 0.45, x + w * 0.4, baseY - h * 0.45, x, baseY - h * 0.8]);
      g.drawPolygon([x - w * 0.3, baseY - h * 0.7, x + w * 0.3, baseY - h * 0.7, x, baseY - h]);
      g.endFill();

      // Canopy highlight clumps give each tier volume instead of a flat triangle.
      const tierYs = [baseY - h * 0.35, baseY - h * 0.6, baseY - h * 0.85];
      tierYs.forEach((ty, tierIndex) => {
        drawBlob(g, x - w * (0.12 - tierIndex * 0.02), ty, w * 0.13, color, highlight);
      });
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
    const highlight = lerpColor(color, 0xffffff, 0.3);
    const moss = lerpColor(color, palette.accent, 0.4);

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

      // A weathering crack and a moss patch at the base read as age, not dirt.
      g.lineStyle(1, highlight, 0.4);
      g.moveTo(x - w * 0.15, baseY - h * 0.75);
      g.lineTo(x + w * 0.12, baseY - h * 0.3);
      g.lineStyle(0);

      g.beginFill(moss, 0.5);
      g.drawEllipse(x - w * 0.1, baseY - h * 0.1, w * 0.32, w * 0.18);
      g.endFill();
    }
  };
}

function makeDrawFortress(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    const baseY = height * 0.8;
    const x = width * 0.55;
    const color = landmarkColor(palette);
    const mortar = lerpColor(color, 0x000000, 0.4);

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

    // Brick coursing, one call per solid rect so mortar lines never spill
    // into the gaps between the towers.
    drawBrickCourses(g, x - 70, baseY - 46, 140, 46, mortar, 10, 18);
    drawBrickCourses(g, x - 90, baseY - 70, 26, 70, mortar, 10, 13);
    drawBrickCourses(g, x + 64, baseY - 70, 26, 70, mortar, 10, 13);
    drawBrickCourses(g, x - 14, baseY - 82, 28, 82, mortar, 10, 14);

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
    const highlight = lerpColor(color, palette.accent, 0.3);

    g.beginFill(color);
    g.drawPolygon([x - 95, baseY, x - 35, baseY, x - 60, baseY - 65]);
    g.drawPolygon([x + 35, baseY, x + 95, baseY, x + 65, baseY - 75]);
    g.endFill();

    // Rock-face shading, not noise.
    drawBlob(g, x - 65, baseY - 28, 10, color, highlight);
    drawBlob(g, x - 45, baseY - 12, 7, color, highlight);
    drawBlob(g, x + 60, baseY - 36, 11, color, highlight);
    drawBlob(g, x + 78, baseY - 15, 7, color, highlight);

    g.beginFill(palette.accent, 0.85);
    g.drawPolygon([x - 12, baseY, x + 8, baseY, x + 4, baseY - 50, x - 6, baseY - 32]);
    g.endFill();

    // A handful of embers drifting off the crack.
    for (let i = 0; i < 5; i++) {
      const ex = x + (Math.random() - 0.5) * 28;
      const ey = baseY - 20 - Math.random() * 55;
      drawSparkle(g, ex, ey, 1.5 + Math.random(), palette.accent, 0.8);
    }

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
    const highlight = lerpColor(color, 0xffffff, 0.15);

    g.beginFill(color);
    g.drawPolygon([x - 90, baseY, x + 90, baseY, x + 20, baseY - 100, x - 20, baseY - 100]);
    g.endFill();

    // Slope shading (rock ridges) instead of noise.
    drawBlob(g, x - 50, baseY - 28, 9, color, highlight);
    drawBlob(g, x - 25, baseY - 55, 7, color, highlight);
    drawBlob(g, x + 45, baseY - 34, 9, color, highlight);
    drawBlob(g, x + 20, baseY - 60, 6, color, highlight);

    g.beginFill(palette.accent, 0.9);
    g.drawEllipse(x, baseY - 100, 22, 8);
    g.endFill();

    g.beginFill(palette.accent, 0.6);
    g.drawPolygon([x - 8, baseY - 96, x + 8, baseY - 96, x + 16, baseY - 20, x - 16, baseY - 20]);
    g.endFill();

    // Embers rising off the crater.
    for (let i = 0; i < 4; i++) {
      const ex = x + (Math.random() - 0.5) * 18;
      const ey = baseY - 98 - Math.random() * 22;
      drawSparkle(g, ex, ey, 1.4 + Math.random(), palette.accent, 0.75);
    }
  };
}
